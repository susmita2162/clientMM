// src/services/claimsApi.ts
//
// Uses the same error handling pattern as memberService.ts and
// employerGroupService.ts in the remote MFEs:
//   - fetchWithTimeout  — AbortController-based timeout
//   - extractError      — parses non-ok Response into ApiError shape
//   - handleError       — wraps anything into ApiServiceError (throwable)
//
// API base URL is injected via VITE_MOCK_API_BASE_URL as a Docker build arg
// by Jenkins. Dev: set it in .env. Never hardcoded, never committed.

import {
  type ClaimsResponse,
  type ClaimSearchResult,
  type DenialReason,
  type DenialReasonsResponse,
  type EmployerGroupSearchResult,
  type HaltedClaim,
  type MemberSearchResult,
  type QueueClaimResponse,
} from '../types/claims';
import { ApiServiceError } from '../types/errorTypes';
import { extractError, handleError } from '../utils/errorUtils';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MOCK_API_URL =
  (import.meta.env.VITE_MOCK_API_BASE_URL as string | undefined) ?? '';

const REQUEST_TIMEOUT_MS = 15_000;

if (import.meta.env.DEV && !MOCK_API_URL) {
  console.warn(
    '[claimsApi] VITE_MOCK_API_BASE_URL is not set — API calls will fail. ' +
      'Add it to your .env file.'
  );
}

// ---------------------------------------------------------------------------
// Timeout helper — same pattern as memberService.fetchWithTimeout
// ---------------------------------------------------------------------------

function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const claimsApi = {
  /**
   * Fetch all claims summary data (Claims Counts table).
   * GET /api/claims
   */
  async getClaims(): Promise<ClaimsResponse> {
    try {
      const response = await fetchWithTimeout(`${MOCK_API_URL}/api/claims`);
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as ClaimsResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Fetch the list of valid denial reason codes.
   * Called once on Client Manual Match dashboard load.
   * GET /api/claims/denial-reasons
   */
  async getDenialReasons(): Promise<DenialReason[]> {
    try {
      const response = await fetchWithTimeout(
        `${MOCK_API_URL}/api/claims/denial-reasons`
      );
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const data = (await response.json()) as unknown as DenialReasonsResponse;
      return data.denialReasons;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Search for a halted claim by EDP Claim ID or Client Claim ID.
   *
   * 404 → structured ClaimSearchResult { found: false } — intentional business
   *        logic (not found / locked), not a thrown error.
   * All other failures → thrown ApiServiceError (network, timeout, 5xx).
   *
   * GET /api/claims/search?claimId=XXX
   */
  async searchHaltedClaim(claimId: string): Promise<ClaimSearchResult> {
    try {
      const response = await fetchWithTimeout(
        `${MOCK_API_URL}/api/claims/search?claimId=${encodeURIComponent(claimId)}`
      );

      // 404 is an expected business response — return structured shape,
      // do not throw, so the UI shows the "Halted Claim Not Found" dialog.
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
   * Fetch a specific claim by claim number.
   * Used when navigating directly to /claim/:claimId.
   * GET /api/claims/:claimId
   */
  async getClaimById(claimId: string): Promise<HaltedClaim> {
    try {
      const response = await fetchWithTimeout(
        `${MOCK_API_URL}/api/claims/${encodeURIComponent(claimId)}`
      );
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const data = (await response.json()) as { claim: HaltedClaim };
      return data.claim;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Get the next available claim from a queue.
   * 404 (QUEUE_EMPTY) → returns { claim: null } — not a thrown error.
   * GET /api/claims/queue/next?claimStream=X&category=X&claimType=X
   */
  async getNextClaimFromQueue(params: {
    claimStream: string;
    category: string;
    claimType: string;
  }): Promise<QueueClaimResponse> {
    try {
      const query = new URLSearchParams({
        claimStream: params.claimStream,
        category: params.category,
        claimType: params.claimType,
      });

      const response = await fetchWithTimeout(
        `${MOCK_API_URL}/api/claims/queue/next?${query.toString()}`
      );

      // Empty queue is expected — return gracefully, don't throw
      if (response.status === 404) {
        return {
          claim: null as unknown as HaltedClaim,
          queueKey: '',
          message: 'No claims available in this queue',
        };
      }

      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as QueueClaimResponse;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Search for members by Insured ID and Network.
   * GET /api/members/search?insuredId=X&network=X
   */
  async searchMembers(params: {
    insuredId: string;
    network: string;
  }): Promise<MemberSearchResult[]> {
    try {
      const query = new URLSearchParams(params);
      const response = await fetchWithTimeout(
        `${MOCK_API_URL}/api/members/search?${query.toString()}`
      );
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const data = (await response.json()) as { members: MemberSearchResult[] };
      return data.members ?? [];
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Search for employer groups by Insured ID and Network.
   * GET /api/employer-groups/search?insuredId=X&network=X
   */
  async searchEmployerGroups(params: {
    insuredId: string;
    network: string;
  }): Promise<EmployerGroupSearchResult[]> {
    try {
      const query = new URLSearchParams(params);
      const response = await fetchWithTimeout(
        `${MOCK_API_URL}/api/employer-groups/search?${query.toString()}`
      );
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      const data = (await response.json()) as {
        employerGroups: EmployerGroupSearchResult[];
      };
      return data.employerGroups ?? [];
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Health check — verifies the mock server is reachable.
   * GET /health
   */
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await fetchWithTimeout(`${MOCK_API_URL}/health`);
      if (!response.ok) throw new ApiServiceError(await extractError(response));
      return (await response.json()) as { status: string };
    } catch (error) {
      throw handleError(error);
    }
  },
};
