// src/components/ClaimsTable/useClaimsData.ts
import { useState, useEffect } from 'react';
import { type ClaimStreamData } from '../../types/claims';
import { claimsApi } from '../../services/claimsApi';

interface UseClaimsDataReturn {
  rows: ClaimStreamData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching claims data
 * Separates data fetching logic from UI component
 */
export const useClaimsData = (): UseClaimsDataReturn => {
  const [rows, setRows] = useState<ClaimStreamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaimsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await claimsApi.getClaims();
      setRows(data.reviewclaimsCountMap);
    } catch (err) {
      setError(
        'Failed to load claims data. Please ensure the server is running on port 3001.'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimsData();
  }, []);

  return {
    rows,
    loading,
    error,
    refetch: fetchClaimsData,
  };
};
