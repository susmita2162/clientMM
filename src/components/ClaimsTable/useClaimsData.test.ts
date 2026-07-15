// src/components/ClaimsTable/useClaimsData.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClaimsData } from '../../../src/components/ClaimsTable/useClaimsData';
import { claimsApi } from '../../../src/services/claimsApi';

vi.mock('../../../src/services/claimsApi', () => ({
  claimsApi: {
    getClaims: vi.fn(),
  },
}));

const mockedGetClaims = vi.mocked(claimsApi.getClaims);

describe('useClaimsData', () => {
  beforeEach(() => {
    mockedGetClaims.mockReset();
  });

  it('starts in a loading state and populates rows on success', async () => {
    const rows = [{ claimStream: 'HEOS' }] as unknown as ReturnType<
      typeof useClaimsData
    >['rows'];
    mockedGetClaims.mockResolvedValueOnce({ reviewclaimsCountMap: rows });

    const { result } = renderHook(() => useClaimsData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toEqual(rows);
    expect(result.current.error).toBeNull();
    expect(mockedGetClaims).toHaveBeenCalledTimes(1);
  });

  it('sets an error message and stops loading when the API call fails', async () => {
    mockedGetClaims.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useClaimsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toContain('Failed to load claims data');
    expect(result.current.rows).toEqual([]);
  });

  it('refetch() re-invokes the API and refreshes rows', async () => {
    mockedGetClaims.mockResolvedValueOnce({ reviewclaimsCountMap: [] });
    const { result } = renderHook(() => useClaimsData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newRows = [{ claimStream: 'UB' }] as unknown as ReturnType<
      typeof useClaimsData
    >['rows'];
    mockedGetClaims.mockResolvedValueOnce({ reviewclaimsCountMap: newRows });

    await result.current.refetch();

    await waitFor(() => expect(result.current.rows).toEqual(newRows));
    expect(mockedGetClaims).toHaveBeenCalledTimes(2);
  });
});
