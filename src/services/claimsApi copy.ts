// src/services/claimsApi.ts - UPDATED FOR PHASE-2
import {
  type ClaimsResponse,
  type ClaimSearchResult,
  type HaltedClaim,
  type QueueClaimResponse,
} from '../types/claims';

const API_MODE = import.meta.env.VITE_API_MODE || 'mock';
const MOCK_API_URL = import.meta.env.VITE_MOCK_API_BASE_URL || '';
const IS_LIVE = API_MODE === 'live';

export const claimsApi = {
  /**
   * Fetch all claims data from the API
   */
  async getClaims(): Promise<ClaimsResponse> {
    try {
      const response = await fetch(`${MOCK_API_URL}/api/claims`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ClaimsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching claims data:', error);
      throw error;
    }
  },

  /**
   * Search for a halted claim by EDP Claim ID or Client Claim ID
   * Returns whether claim exists and is accessible
   *
   * @param claimId - EDP Claim ID or Client Claim ID
   * @returns ClaimSearchResult with found status and claim data
   */
  async searchHaltedClaim(claimId: string): Promise<ClaimSearchResult> {
    try {
      const response = await fetch(
        `${MOCK_API_URL}/api/claims/search?claimId=${encodeURIComponent(claimId)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            found: false,
            error: 'NOT_FOUND',
            message:
              'The specified claim was not found. Either it is not a halted claim, it is locked by another user, or it does not exist.',
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ClaimSearchResult = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching for claim:', error);
      throw error;
    }
  },

  /**
   * Get a specific claim by claim number
   * Used for direct claim access via /claim/:claimId route
   *
   * @param claimId - Claim number
   * @returns HaltedClaim object
   */
  async getClaimById(claimId: string): Promise<HaltedClaim> {
    try {
      const response = await fetch(
        `${MOCK_API_URL}/api/claims/${encodeURIComponent(claimId)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Claim not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.claim;
    } catch (error) {
      console.error('Error fetching claim by ID:', error);
      throw error;
    }
  },

  /**
   * Get next available claim from queue
   * Used when clicking count numbers in Claims Summary table
   *
   * @param params - Queue parameters (claimStream, category, claimType)
   * @returns QueueClaimResponse with next claim
   */
  async getNextClaimFromQueue(params: {
    claimStream: string;
    category: string;
    claimType: string;
  }): Promise<QueueClaimResponse> {
    try {
      const queryParams = new URLSearchParams({
        claimStream: params.claimStream,
        category: params.category,
        claimType: params.claimType,
      });

      const response = await fetch(
        `${MOCK_API_URL}/api/claims/queue/next?${queryParams}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            claim: null as any,
            queueKey: '',
            message: 'No claims available in this queue',
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: QueueClaimResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching next claim from queue:', error);
      throw error;
    }
  },

  /**
   * Search for members by Insured ID and Network
   * Used in Member Search micro-frontend
   *
   * @param params - Search parameters (insuredId, network)
   * @returns Array of member search results
   */
  async searchMembers(params: {
    insuredId: string;
    network: string;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams({
        insuredId: params.insuredId,
        network: params.network,
      });

      const response = await fetch(
        `${MOCK_API_URL}/api/members/search?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.members || [];
    } catch (error) {
      console.error('Error searching members:', error);
      throw error;
    }
  },

  /**
   * Search for employer groups by Insured ID and Network
   * Used in Employer Group Search micro-frontend
   *
   * @param params - Search parameters (insuredId, network)
   * @returns Array of employer group search results
   */
  async searchEmployerGroups(params: {
    insuredId: string;
    network: string;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams({
        insuredId: params.insuredId,
        network: params.network,
      });

      const response = await fetch(
        `${MOCK_API_URL}/api/employer-groups/search?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.employerGroups || [];
    } catch (error) {
      console.error('Error searching employer groups:', error);
      throw error;
    }
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${MOCK_API_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
};
