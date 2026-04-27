// src/services/claimsApi.ts
//
// Mode-switching service:
//   VITE_API_MODE=mock → MOCK_API_URL  (paths passed as-is to mock server)
//   VITE_API_MODE=live → LIVE_API_URL  (buildUrl adds service prefix — see below)
//
// Live service routing:
//   The Vite dev proxy (vite.config.ts) rewrites paths at dev-server level,
//   but that proxy is NOT running in the deployed environment (Docker/OKE).
//   buildUrl() therefore applies the same rewrite logic directly so routing
//   is correct in both development and production:
//
//     /api/client-match/* → {LIVE_API_URL}/claim-match/api/client-match/*
//     /api/clientmatch/*  → {LIVE_API_URL}/claimsearchservice/api/clientmatch/*
//     /api/clientMatch/*  → {LIVE_API_URL}/claimsearchservice/api/clientMatch/*
//
//   This mirrors the vite.config.ts proxy rewrite exactly so nginx/ingress
//   receives the correct service-prefixed path in production.

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
const LIVE_API_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const API_TIMEOUT = parseInt(
  (import.meta.env.VITE_API_TIMEOUT as string | undefined) ?? '15000',
  10
);

// Warn only when the env var itself is absent — the variable always has a
// localhost fallback so checking !MOCK_API_URL would never trigger.
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
// API PATHS — relative, service-agnostic
// buildUrl() adds the correct service prefix in live mode.
// Mock server handles all paths without any prefix.
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
 * Builds the full request URL.
 *
 * Mock mode: MOCK_API_URL + path (no prefix — mock server handles all paths).
 *
 * Live mode: LIVE_API_URL + service-prefix + path.
 *   Service prefix mirrors the Vite proxy rewrite in vite.config.ts so the
 *   correct service is reached in both the Vite dev server and production nginx:
 *     /api/client-match/* → /claim-match/api/client-match/*
 *     /api/clientmatch/*  → /claimsearchservice/api/clientmatch/*
 *     /api/clientMatch/*  → /claimsearchservice/api/clientMatch/*
 */
function buildUrl(path: string): string {
  if (!IS_LIVE) return `${MOCK_API_URL}${path}`;

  const servicePrefix = path.startsWith('/api/client-match')
    ? '/claim-match'
    : '/claimsearchservice';

  return `${LIVE_API_URL}${servicePrefix}${path}`;
}

/**
 * Wraps fetch() with an AbortController timeout.
 * AbortError is mapped to HTTP 408 by handleError.
 */
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
//   claimType           ← live.claimType ("H"→HCFA, "U"→UB)
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

function mapClaimType(raw: string | null | undefined): 'HCFA' | 'UB' {
  return (raw ?? '').toUpperCase() === 'U' ? 'UB' : 'HCFA';
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
    claimType: mapClaimType(live.claimType),
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
   * Find halted claim by EDP Claim ID.
   * GET /api/clientMatch/claim/findByClaimId/{id}  →  claimsearchservice
   * 200 → adapted HaltedClaim.  404 → { found: false }.
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
   * GET /api/clientMatch/claim/findByClientClaimId/{id}  →  claimsearchservice
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
   * GET /api/client-match/claim-match-action/denial-reasons  →  claim-match
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

  /** POST /api/client-match/claim-match-action/pend */
  /**
   * Pend a claim.
   * POST /api/client-match/claim-match-action/pend
   *
   * Request:  PendClaimRequest
   * Response: {} on 200 — modelled as void.
   */ async pendClaim(params: PendClaimRequest): Promise<void> {
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
   * POST /api/client-match/claim-match-action/deny
   *
   * Request:  DenyDecisionRequest
   * Response: ClaimActionResponse { header, status }
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
   * Update CCode for a claim.
   * POST /api/client-match/claim-match-action/claim/updateCcode
   *
   * Request:  UpdateCcodeRequest
   * Response: ClaimActionResponse { header, status }
   * 409: CCode validation failed — thrown as ApiServiceError.
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
   * POST /api/client-match/claim-match-action/claim/reset
   *
   * Request:  ResetSearchRequest
   * Response: {} on 200 — modelled as void.
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
