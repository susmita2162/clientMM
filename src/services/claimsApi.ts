// src/services/claimsApi.ts
//
// Two live services, two base URL env vars:
//
//   VITE_CLAIMS_SEARCH_API_URL  — claimsearchservice base
//     e.g. https://claims-poc.dev.multiplan.com/claimsearchservice
//     Handles: /api/clientmatch/claims  (summary counts table)
//
//   VITE_CLAIM_MATCH_API_URL    — claim-match service base
//     e.g. https://claims-poc.dev.multiplan.com/claim-match
//     Handles: /findByClaimId/:id
//              /findByClientClaimId/:id
//              /api/client-match/claim-match-action/*
//
//   In mock mode both resolve to VITE_MOCK_API_BASE_URL (localhost:3001).
//   In Docker/OKE set both vars to the correct service base — nginx/ingress
//   is bypassed for routing since the full service URL is already in the request.

import {
  type ClaimActionResponse,
  type ClaimsResponse,
  type DenialReason,
  type DenyDecisionRequest,
  type HaltedClaimApiResponse,
  type NextHaltedClaimRequest,
  type PendClaimRequest,
  type ResetSearchRequest,
  type UpdateCcodeRequest,
  type UpdateCcodeAlertResponse,
  type UpdateCcodeResult,
} from '../types/claims';
import { ApiServiceError } from '../types/errorTypes';
import { extractError, handleError } from '../utils/errorUtils';

// ============================================================================
// CONFIG
//
// Runtime-configurable (not frozen at this package's own Vite build time).
//
// WHY: import.meta.env.VITE_* values are substituted once, when THIS package
// is built. A consuming host (e.g. chassis, a Next.js/webpack app) has its
// own build pipeline and its own environment — it cannot influence values
// already baked into this package's compiled output. Without a runtime
// override, every host is stuck with whatever base URLs happened to be set
// when ucp-client-match-ui was last built (typically local/dev defaults),
// regardless of what that host actually needs.
//
// configureClaimsService() is the override hook. The standalone app
// (main.tsx / this package's own dev server) never calls it, so it keeps
// using the VITE_* defaults below exactly as before — no behavior change.
// Hosts like chassis call it once at startup with their own live URLs.
// ============================================================================

interface ClaimsServiceConfig {
  mode: 'mock' | 'live';
  mockBaseUrl: string;
  claimsSearchBaseUrl: string;
  claimMatchBaseUrl: string;
  timeoutMs: number;
}

const DEFAULT_CONFIG: ClaimsServiceConfig = {
  mode: import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock',
  mockBaseUrl:
    import.meta.env.VITE_MOCK_API_BASE_URL || 'http://localhost:3001',
  claimsSearchBaseUrl: import.meta.env.VITE_CLAIMS_SEARCH_API_URL,
  claimMatchBaseUrl: import.meta.env.VITE_CLAIM_MATCH_API_URL,
  timeoutMs: Number.parseInt(import.meta.env.VITE_API_TIMEOUT, 10) || 30000,
};

let config: ClaimsServiceConfig = { ...DEFAULT_CONFIG };

/**
 * Overrides claimsApi's runtime config. Call once, at host startup, before
 * any claimsApi.* method is invoked (e.g. chassis calls this in its
 * ManualReview wrapper before ManualReviewDashboard/ClaimsTable mount).
 *
 * Safe to leave uncalled — claimsApi falls back to this package's own
 * VITE_* build-time defaults (used by the standalone claims-sum app).
 */
export function configureClaimsService(
  overrides: Partial<ClaimsServiceConfig>
): void {
  config = { ...config, ...overrides };

  if (import.meta.env.DEV && config.mode === 'live') {
    if (!config.claimsSearchBaseUrl) {
      console.warn(
        '[claimsApi] configureClaimsService: claimsSearchBaseUrl is empty.'
      );
    }
    if (!config.claimMatchBaseUrl) {
      console.warn(
        '[claimsApi] configureClaimsService: claimMatchBaseUrl is empty.'
      );
    }
  }
}

export type { ClaimsServiceConfig };

if (import.meta.env.DEV && DEFAULT_CONFIG.mode === 'live') {
  if (!DEFAULT_CONFIG.claimsSearchBaseUrl) {
    console.warn('[claimsApi] VITE_CLAIMS_SEARCH_API_URL is not set.');
  }
  if (!DEFAULT_CONFIG.claimMatchBaseUrl) {
    console.warn('[claimsApi] VITE_CLAIM_MATCH_API_URL is not set.');
  }
}

if (
  import.meta.env.DEV &&
  DEFAULT_CONFIG.mode !== 'live' &&
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
  // claimsearchservice — summary counts table only
  claims: '/api/clientmatch/claims',
  // claim-match service — all three search endpoints confirmed from Postman (Images 15, 16)
  findByClaimId: '/findByClaimId',
  findByClientClaimId: '/findByClientClaimId',
  // claim-match service — actions
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
  if (config.mode === 'live') return { Accept: 'application/json' };
  return {};
}

/** Extends getHeaders() with Content-Type for POST request bodies. */
function getPostHeaders(): Record<string, string> {
  return { ...getHeaders(), 'Content-Type': 'application/json' };
}

/**
 * Resolves the correct base URL per path and mode.
 *
 * Mock: all paths → MOCK_API_URL
 * Live: /api/clientmatch/* → CLAIMS_SEARCH_API_URL (summary counts only)
 *       everything else    → CLAIM_MATCH_API_URL
 *
 * Note: /findByClaimId and /findByClientClaimId route to CLAIM_MATCH_API_URL —
 * confirmed from Postman (https://clm-poc.dev.multiplan.com/claim-match/findByClaimId/...).
 */
function buildUrl(path: string): string {
  if (config.mode !== 'live') return `${config.mockBaseUrl}${path}`;

  const base = path.startsWith('/api/clientmatch')
    ? config.claimsSearchBaseUrl
    : config.claimMatchBaseUrl;

  return `${base}${path}`;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), config.timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const claimsApi = {
  /** GET /api/clientmatch/claims → claim counts summary table */
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
   * GET /findByClaimId/{claimId}?lockByUser=system&lockExpiration=15  →  claim-match
   *
   * Returns raw HaltedClaimApiResponse on success — caller calls adaptHaltedClaimResponse.
   * Returns null on 404 (not found / not halted / locked by another user).
   */
  async searchByClaimId(
    claimId: string
  ): Promise<HaltedClaimApiResponse | null> {
    try {
      const url = `${buildUrl(PATHS.findByClaimId)}/${encodeURIComponent(claimId)}?lockByUser=system&lockExpiration=15`;
      const response = await fetchWithTimeout(url, { headers: getHeaders() });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as HaltedClaimApiResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Find halted claim by Client Claim ID.
   * GET /findByClientClaimId/{clientClaimId}?lockByUser=system&lockExpiration=15  →  claim-match
   *
   * Same response shape as searchByClaimId — caller calls adaptHaltedClaimResponse.
   * Returns null on 404.
   */
  async searchByClientClaimId(
    clientClaimId: string
  ): Promise<HaltedClaimApiResponse | null> {
    try {
      const url = `${buildUrl(PATHS.findByClientClaimId)}/${encodeURIComponent(clientClaimId)}?lockByUser=system&lockExpiration=15`;
      const response = await fetchWithTimeout(url, { headers: getHeaders() });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as HaltedClaimApiResponse;
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
   *
   * Returns raw HaltedClaimApiResponse — caller calls adaptHaltedClaimResponse.
   * Returns null when the queue is empty (404).
   */
  async getNextHaltedClaim(
    params: NextHaltedClaimRequest
  ): Promise<HaltedClaimApiResponse | null> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.nextHalted), {
        method: 'POST',
        headers: getPostHeaders(),
        body: JSON.stringify(params),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as HaltedClaimApiResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * POST /api/client-match/claim-match-action/pend
   *
   * Pends the current claim. Does not return the next halted claim —
   * call getNextHaltedClaim (POST /nextHalted) separately after success
   * to load the next claim from the queue.
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
   * POST /api/client-match/claim-match-action/claim/updateCcode
   *
   * Always returns HTTP 200. Discriminate on status.statusCode:
   *   'C' → success — claim validated and locked; caller should pend to get next.
   *   'P' → validation warning (ccodeNotEffective / policy invalid):
   *          canOverride: true → show description in Yes/No dialog.
   *          Yes → re-submit with forceCcode: true (ccodeNotEffective)
   *               or forcePolicy: true (invalid === 'policy').
   *   'A' → hard failure (ccodeNotFound): canOverride: false
   *          Show description inline; offer Retry + Return to Dashboard.
   *
   * forceCcode and forcePolicy always default to false on the first submission.
   */
  async updateCcode(params: UpdateCcodeRequest): Promise<UpdateCcodeResult> {
    try {
      const response = await fetchWithTimeout(buildUrl(PATHS.updateCcode), {
        method: 'POST',
        headers: getPostHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new ApiServiceError(await extractError(response));

      const raw = (await response.json()) as Record<string, unknown>;

      // Discriminate on status.statusCode (object, not a string flag).
      // 'C' = success; anything else ('P', 'A') = alert/failure.
      const status = raw.status as Record<string, unknown> | undefined;
      const statusCode = (status?.statusCode as string | undefined) ?? '';

      if (statusCode === 'C') {
        return { type: 'success', data: raw as unknown as ClaimActionResponse };
      }

      return {
        type: 'alert',
        data: raw as unknown as UpdateCcodeAlertResponse,
      };
    } catch (error) {
      throw handleError(error);
    }
  },

  /** POST /api/client-match/claim-match-action/claim/reset */
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
