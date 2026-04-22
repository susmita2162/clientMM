// src/services/claimsApi.ts
//
// Mode-switching service — identical pattern to employerGroupService.ts:
//   VITE_API_MODE=mock → MOCK_API_URL (mock server, same paths as live)
//   VITE_API_MODE=live → LIVE_API_URL (Vite proxy rewrites to correct service)
//
// Two live services, distinguished by path prefix:
//   /api/clientmatch/*   → claimsearchservice  (Vite: prepends /claimsearchservice)
//   /api/client-match/*  → claim-match service (Vite: prepends /claim-match)
//
// Mock server exposes aliases at the same paths so both modes call identical
// URLs — VITE_API_MODE is the only thing that changes.
//
// In Docker/OKE, LIVE_API_URL="" — nginx/ingress handles service routing.

import {
  type ClaimActionResponse,
  type ClaimsResponse,
  type ClaimSearchResult,
  type DenialReason,
  type DenyDecisionRequest,
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
// CONFIG — mirrors employerGroupService.ts exactly
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
    '[claimsApi] VITE_MOCK_API_BASE_URL is not set — falling back to http://localhost:3001. ' +
      'Add it to your .env file.'
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

  // No confirmed live equivalent — mock server serves these paths in both modes
  claimById: '/api/claims',
  health: '/health',
} as const;

// ============================================================================
// PRIVATE HELPERS — mirrors employerGroupService.ts pattern
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
 * Builds the full request URL for the current mode.
 * Live: LIVE_API_URL (empty in Docker/OKE — proxy/ingress handles prefix).
 * Mock: MOCK_API_URL — same path, no rewriting needed.
 */
function buildUrl(path: string): string {
  return `${IS_LIVE ? LIVE_API_URL : MOCK_API_URL}${path}`;
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
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

// ============================================================================
// PUBLIC API
// One function per operation. buildUrl() used in every method — no exceptions.
// ============================================================================

export const claimsApi = {
  /**
   * Fetch claim counts summary (Claims Counts table).
   * GET /api/clientmatch/claims
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
   * Search halted claim by EDP Claim ID.
   * GET /api/clientMatch/claim/findByClaimId/{claimId}
   *
   * 404 → { found: false } — business logic, not thrown.
   * UI shows "Halted Claim Not Found" dialog.
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
      return (await response.json()) as ClaimSearchResult;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Search halted claim by Client Claim ID.
   * GET /api/clientMatch/claim/findByClientClaimId/{clientClaimId}
   *
   * 404 → { found: false } — business logic, not thrown.
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
      return (await response.json()) as ClaimSearchResult;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Fetch denial reason codes.
   * GET /api/client-match/claim-match-action/denial-reasons
   *
   * Live returns plain string[]. Normalized to { value, label }[] here
   * so UI dropdown contract does not change.
   * Mock mirrors the same plain string[] shape.
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
   * Get next halted claim from queue.
   * POST /api/client-match/claim-match-action/nextHalted
   *
   * Request:  NextHaltedClaimRequest
   * Response: NextHaltedClaimResponse | null
   * 404 → null (queue empty) — not thrown.
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
   * Fetch a specific claim by claim number.
   * GET /api/claims/:claimId
   *
   * No confirmed live endpoint — mock server handles in both modes via buildUrl().
   */
  async getClaimById(claimId: string): Promise<HaltedClaim> {
    try {
      const url = `${buildUrl(PATHS.claimById)}/${encodeURIComponent(claimId)}`;
      const response = await fetchWithTimeout(url, { headers: getHeaders() });
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const data = (await response.json()) as { claim: HaltedClaim };
      return data.claim;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Pend a claim.
   * POST /api/client-match/claim-match-action/pend
   *
   * Request:  PendClaimRequest
   * Response: {} on 200 — modelled as void.
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

  /**
   * GET /health
   */
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
