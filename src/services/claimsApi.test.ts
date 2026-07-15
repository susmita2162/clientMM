// src/services/claimsApi.test.ts
//
// claimsApi reads import.meta.env at module load time (mode, base URLs,
// timeout), so each test that needs a specific env combination stubs the
// env THEN resets the module registry and re-imports claimsApi fresh.
// This avoids relying on whatever .env Vitest happens to load, and lets us
// test the mock-mode URL building deterministically.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiServiceError } from '../../src/types/errorTypes';

function mockFetchResponse(
  ok: boolean,
  status: number,
  body: unknown
): Response {
  return {
    ok,
    status,
    statusText: 'MOCKED',
    json: async () => body,
  } as unknown as Response;
}

describe('claimsApi (mock mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_MODE', 'mock');
    vi.stubEnv('VITE_MOCK_API_BASE_URL', 'http://localhost:3001');
    vi.stubEnv('VITE_API_TIMEOUT', '5000');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('getClaims calls the mock base URL and returns the parsed response', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    const payload = { reviewclaimsCountMap: [] };
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(true, 200, payload)
    );

    const result = await claimsApi.getClaims();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/clientmatch/claims',
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(result).toEqual(payload);
  });

  it('getClaims throws ApiServiceError when the response is not ok', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(false, 500, { message: 'boom' })
    );

    await expect(claimsApi.getClaims()).rejects.toBeInstanceOf(ApiServiceError);
  });

  it('searchByClaimId returns null on 404 (not found / locked / not halted)', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(false, 404, null));

    const result = await claimsApi.searchByClaimId('272120489');
    expect(result).toBeNull();
  });

  it('searchByClaimId builds the correct URL with lock query params', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(true, 200, {}));

    await claimsApi.searchByClaimId('272120489');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/findByClaimId/272120489?lockByUser=system&lockExpiration=15',
      expect.anything()
    );
  });

  it('searchByClientClaimId URL-encodes the id and hits the correct endpoint', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(true, 200, {}));

    await claimsApi.searchByClientClaimId('CLI 998');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/findByClientClaimId/CLI%20998?lockByUser=system&lockExpiration=15',
      expect.anything()
    );
  });

  it('denyClaim POSTs JSON with the correct Content-Type header', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(true, 200, { status: 'ok' })
    );

    const params = {
      claimNumber: '272120489',
      denialReason: 'DUP',
    } as Parameters<typeof claimsApi.denyClaim>[0];
    await claimsApi.denyClaim(params);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/client-match/claim-match-action/deny',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(params),
      })
    );
  });

  it('updateCcode returns type "success" when status.statusCode is "C"', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(true, 200, { status: { statusCode: 'C' } })
    );

    const result = await claimsApi.updateCcode({
      claimNumber: '272120489',
      ccode: 'CC01',
    } as Parameters<typeof claimsApi.updateCcode>[0]);

    expect(result.type).toBe('success');
  });

  it('updateCcode returns type "alert" for any non-"C" statusCode', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(true, 200, {
        status: { statusCode: 'P', description: 'not effective' },
      })
    );

    const result = await claimsApi.updateCcode({
      claimNumber: '272120489',
      ccode: 'CC01',
    } as Parameters<typeof claimsApi.updateCcode>[0]);

    expect(result.type).toBe('alert');
  });

  it('getNextHaltedClaim returns null when the queue is empty (404)', async () => {
    const { claimsApi } = await import('../../src/services/claimsApi');
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(false, 404, null));

    const result = await claimsApi.getNextHaltedClaim({
      stream: 'HEOS',
    } as Parameters<typeof claimsApi.getNextHaltedClaim>[0]);

    expect(result).toBeNull();
  });
});
