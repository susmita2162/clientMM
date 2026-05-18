// src/services/claimsApi.ts
//
// Two live services, two base URL env vars:
//
//   VITE_CLAIMS_SEARCH_API_URL  — claimsearchservice base
//     e.g. https://claims-poc.dev.multiplan.com/claimsearchservice
//     Handles: /api/clientmatch/claims
//              /api/clientMatch/claim/findByClaimId/:id
//              /api/clientMatch/claim/findByClientClaimId/:id
//
//   VITE_CLAIM_MATCH_API_URL    — claim-match service base
//     e.g. https://claims-poc.dev.multiplan.com/claim-match
//     Handles: /api/client-match/claim-match-action/*
//
//   In mock mode both resolve to VITE_MOCK_API_BASE_URL (localhost:3001).
//   In Docker/OKE set both vars to the correct service base — nginx/ingress
//   is bypassed for routing since the full service URL is already in the request.

import {
  type ClaimActionResponse,
  type ClaimsResponse,
  type ClaimSearchResult,
  type DenialReason,
  type DenyDecisionRequest,
  type FindByClaimIdLiveResponse,
  type HaltedClaim,
  type NextHaltedClaimRequest,
  type NextHaltedClaimResponse,
  type PendClaimRequest,
  type ResetSearchRequest,
  type UpdateCcodeRequest,
} from '../types/claims';
import { ApiServiceError } from '../types/errorTypes';
import { extractError, handleError } from '../utils/errorUtils';

// ============================================================================
// CONFIG
// ============================================================================

const API_MODE =
  (import.meta.env.VITE_API_MODE as string | undefined) ?? 'mock';
const IS_LIVE = API_MODE === 'live';

const MOCK_API_URL =
  (import.meta.env.VITE_MOCK_API_BASE_URL as string | undefined) ??
  'http://localhost:3001';

// One base URL per service — no path prefix added by buildUrl.
// Set these in .env.local / deployment env to the full service base.
const CLAIMS_SEARCH_API_URL =
  (import.meta.env.VITE_CLAIMS_SEARCH_API_URL as string | undefined) ?? '';
const CLAIM_MATCH_API_URL =
  (import.meta.env.VITE_CLAIM_MATCH_API_URL as string | undefined) ?? '';

const API_TIMEOUT = parseInt(
  (import.meta.env.VITE_API_TIMEOUT as string | undefined) ?? '15000',
  10
);

if (import.meta.env.DEV && IS_LIVE) {
  if (!CLAIMS_SEARCH_API_URL) {
    console.warn('[claimsApi] VITE_CLAIMS_SEARCH_API_URL is not set.');
  }
  if (!CLAIM_MATCH_API_URL) {
    console.warn('[claimsApi] VITE_CLAIM_MATCH_API_URL is not set.');
  }
}

if (
  import.meta.env.DEV &&
  !IS_LIVE &&
  !import.meta.env.VITE_MOCK_API_BASE_URL
) {
  console.warn(
    '[claimsApi] VITE_MOCK_API_BASE_URL not set — falling back to http://localhost:3001'
  );
}

// ============================================================================
// API PATHS
// Defined once, used by both modes — mock server mirrors these exact paths.
// Vite proxy (vite.config.ts) handles live service prefix rewriting.
// ============================================================================

const PATHS = {
  // claimsearchservice
  claims: '/api/clientmatch/claims',
  findByClaimId: '/api/clientMatch/claim/findByClaimId',
  findByClientClaimId: '/api/clientMatch/claim/findByClientClaimId',
  // claim-match service
  denialReasons: '/api/client-match/claim-match-action/denial-reasons',
  nextHalted: '/api/client-match/claim-match-action/nextHalted',
  pend: '/api/client-match/claim-match-action/pend',
  deny: '/api/client-match/claim-match-action/deny',
  updateCcode: '/api/client-match/claim-match-action/claim/updateCcode',
  resetClaim: '/api/client-match/claim-match-action/claim/reset',
  health: '/health',
} as const;

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Returns headers for the current mode.
 * Accept: application/json for live (explicit, safe across all endpoints).
 * Content-Type is omitted — added only by getPostHeaders() for POST requests.
 */
function getHeaders(): Record<string, string> {
  if (IS_LIVE) return { Accept: 'application/json' };
  return {};
}

/** Extends getHeaders() with Content-Type for POST request bodies. */
function getPostHeaders(): Record<string, string> {
  return { ...getHeaders(), 'Content-Type': 'application/json' };
}

/**
 * Resolves the correct base URL per path and mode.
 *
 * Mock:  all paths → MOCK_API_URL
 * Live:  /api/client-match/*  → CLAIM_MATCH_API_URL
 *        everything else       → CLAIMS_SEARCH_API_URL
 */
function buildUrl(path: string): string {
  if (!IS_LIVE) return `${MOCK_API_URL}${path}`;

  const base = path.startsWith('/api/client-match')
    ? CLAIM_MATCH_API_URL
    : CLAIMS_SEARCH_API_URL;

  return `${base}${path}`;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), API_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

// ============================================================================
// ADAPTER — FindByClaimIdLiveResponse → HaltedClaim
//
//   HaltedClaim field   ← live source
//   ─────────────────────────────────────────────────────────────
//   claimNumber         ← live.claimNumber (int64 → string)
//   clientClaimId       ← live.clientClaimNumber
//   claimStream         ← live.lineOfBusiness
//   claimType           ← live.claimType — stored as-is ('H' | 'U').
//                         No conversion — matches nextHalted API contract.
//   dateOfReceipt       ← live.clientReceivedDate ?? live.receivedDate
//   serviceDate         ← live.lines.line[0].serviceFromDate
//   insuredId           ← live.insured.insuredID
//   ccode               ← live.clientCode
//   group               ← live.employer.employerGroupName
//   payer               ← live.payer.payerName
//   dateOfBirth         ← live.insured.dateOfBirth
//   gender              ← live.insured.gender
//   relationship        ← live.insured.relationToPatient
//   address             ← built from live.insured.address
//   scenario            ← additionalInfo.info[scenario]
//   matchType           ← additionalInfo.info[matchType] ?? 'HALT'
//   pendedClaim         ← 'N' (not yet pended when found via search)
// ============================================================================

function parseAdditionalInfo(
  live: FindByClaimIdLiveResponse
): Record<string, string> {
  const items = live.additionalInfo?.info ?? [];
  return Object.fromEntries(items.map((i) => [i.name, i.value]));
}

function buildAddressString(live: FindByClaimIdLiveResponse): string {
  const a = live.insured?.address;
  if (!a) return '';
  const line1 = [a.street1, a.street2].filter(Boolean).join(' ');
  const line2 = [a.city, a.state, a.zip].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

function adaptFindByClaimIdResponse(
  live: FindByClaimIdLiveResponse
): HaltedClaim {
  const info = parseAdditionalInfo(live);
  const insured = live.insured ?? {};
  const name = [insured.firstName, insured.lastName].filter(Boolean).join(' ');
  const serviceDate = live.lines?.line?.[0]?.serviceFromDate ?? '';
  const rawCategory = (info.category ?? '').toUpperCase();
  const category: HaltedClaim['category'] = rawCategory.includes('PENDED')
    ? 'MANUAL_REVIEW_PENDED'
    : 'MANUAL_REVIEW';

  return {
    claimNumber: String(live.claimNumber ?? ''),
    clientClaimId: live.clientClaimNumber ?? '',
    claimStream: live.lineOfBusiness ?? '',
    // Store raw API value ('H' | 'U') — no conversion.
    // Consistent with adaptNextHaltedToHaltedClaim and action payload contract.
    claimType: live.claimType === 'U' ? 'U' : 'H',
    dateOfReceipt: live.clientReceivedDate ?? live.receivedDate ?? '',
    serviceDate,
    policy: '',
    insuredId: insured.insuredID ?? '',
    ccode: live.clientCode ?? '',
    group: live.employer?.employerGroupName ?? '',
    payer: live.payer?.payerName ?? '',
    sender: '',
    network: live.lineOfBusiness ?? '',
    name,
    firstName: insured.firstName ?? '',
    lastName: insured.lastName ?? '',
    dateOfBirth: insured.dateOfBirth ?? '',
    gender: insured.gender ?? '',
    relationship: insured.relationToPatient ?? '',
    address: buildAddressString(live),
    category,
    status: 'HALTED',
    lockedBy: null,
    lockedAt: null,
    pendedClaim: 'N',
    scenario: info.scenario ?? '',
    matchType: info.matchType ?? 'HALT',
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const claimsApi = {
  /**
   * Claim counts summary table.
   * GET /api/clientmatch/claims  →  claimsearchservice
   */
  async getClaims(): Promise<ClaimsResponse> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.claims), {
        headers: getHeaders(),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as ClaimsResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Find halted claim by EDP Claim ID (claimNumber).
   * GET /api/clientMatch/claim/findByClaimId/{claimId}
   *
   * 200 → live nested shape adapted to HaltedClaim → { found: true, claim }
   * 404 → { found: false }  (not found / locked)
   */
  async searchByClaimId(claimId: string): Promise<ClaimSearchResult> {
    try {
      const url = `${buildUrl(PATHS.findByClaimId)}/${encodeURIComponent(claimId)}`;
      const response = await fetchWithTimeout(url, { headers: getHeaders() });

      if (response.status === 404) {
        return {
          found: false,
          error: 'NOT_FOUND',
          message:
            'The specified claim was not found. Either it is not a halted claim, ' +
            'it is locked by another user, or it does not exist.',
        };
      }

      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const live = (await response.json()) as FindByClaimIdLiveResponse;
      return { found: true, claim: adaptFindByClaimIdResponse(live) };
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Find halted claim by Client Claim ID.
   * GET /api/clientMatch/claim/findByClientClaimId/{clientClaimId}
   *
   * Same live shape as findByClaimId — same adapter.
   */
  async searchByClientClaimId(
    clientClaimId: string
  ): Promise<ClaimSearchResult> {
    try {
      const url = `${buildUrl(PATHS.findByClientClaimId)}/${encodeURIComponent(clientClaimId)}`;
      const response = await fetchWithTimeout(url, { headers: getHeaders() });

      if (response.status === 404) {
        return {
          found: false,
          error: 'NOT_FOUND',
          message:
            'The specified claim was not found. Either it is not a halted claim, ' +
            'it is locked by another user, or it does not exist.',
        };
      }

      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const live = (await response.json()) as FindByClaimIdLiveResponse;
      return { found: true, claim: adaptFindByClaimIdResponse(live) };
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Denial reasons.
   * GET /api/client-match/claim-match-action/denial-reasons
   * Live returns string[]; normalized to { value, label }[].
   */
  async getDenialReasons(): Promise<DenialReason[]> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.denialReasons), {
        headers: getHeaders(),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const strings = (await response.json()) as string[];
      return strings.map((s) => ({ value: s, label: s }));
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Next halted claim from queue.
   * POST /api/client-match/claim-match-action/nextHalted  →  claim-match
   * 404 → null (queue empty).
   */
  async getNextHaltedClaim(
    params: NextHaltedClaimRequest
  ): Promise<NextHaltedClaimResponse | null> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.nextHalted), {
        method: 'POST',
        headers: getPostHeaders(),
        body: JSON.stringify(params),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as NextHaltedClaimResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Pend a claim.
   * POST /api/client-match/claim-match-action/pend  →  claim-match
   */
  async pendClaim(params: PendClaimRequest): Promise<void> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.pend), {
        method: 'POST',
        headers: getPostHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Deny a claim.
   * POST /api/client-match/claim-match-action/deny  →  claim-match
   */
  async denyClaim(params: DenyDecisionRequest): Promise<ClaimActionResponse> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.deny), {
        method: 'POST',
        headers: getPostHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as ClaimActionResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Update CCode.
   * POST /api/client-match/claim-match-action/claim/updateCcode  →  claim-match
   */
  async updateCcode(params: UpdateCcodeRequest): Promise<ClaimActionResponse> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.updateCcode), {
        method: 'POST',
        headers: getPostHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as ClaimActionResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Reset claims group data search info.
   * POST /api/client-match/claim-match-action/claim/reset  →  claim-match
   */
  async resetClaim(params: ResetSearchRequest): Promise<void> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.resetClaim), {
        method: 'POST',
        headers: getPostHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
    } catch (error) {
      throw handleError(error);
    }
  },

  /** GET /health */
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.health), {
        headers: getHeaders(),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as { status: string };
    } catch (error) {
      throw handleError(error);
    }
  },
};
