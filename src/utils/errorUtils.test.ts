// src/utils/errorUtils.test.ts
import { describe, it, expect } from 'vitest';
import { extractError, handleError } from '../../src/utils/errorUtils';
import { ApiServiceError } from '../../src/types/errorTypes';

function makeResponse(
  status: number,
  statusText: string,
  body?: unknown
): Response {
  return {
    status,
    statusText,
    json: async () => {
      if (body === undefined) throw new Error('not json');
      return body;
    },
  } as unknown as Response;
}

describe('extractError', () => {
  it('extracts message and errorCode from a JSON body', async () => {
    const response = makeResponse(400, 'Bad Request', {
      message: 'Claim already locked',
      errorCode: 'CLAIM_LOCKED',
    });

    const result = await extractError(response);

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe('Claim already locked');
    expect(result.errorCode).toBe('CLAIM_LOCKED');
  });

  it('falls back to the "error" field when "message" is absent', async () => {
    const response = makeResponse(500, 'Server Error', {
      error: 'Internal failure',
    });

    const result = await extractError(response);
    expect(result.message).toBe('Internal failure');
  });

  it('falls back to "code" when "errorCode" is absent', async () => {
    const response = makeResponse(422, 'Unprocessable', { code: 'VALIDATION' });
    const result = await extractError(response);
    expect(result.errorCode).toBe('VALIDATION');
  });

  it('falls back to statusText when the response body is not JSON', async () => {
    const response = makeResponse(404, 'Not Found');
    const result = await extractError(response);

    expect(result.statusCode).toBe(404);
    expect(result.message).toBe('Not Found');
    expect(result.errorCode).toBeUndefined();
  });

  it('falls back to statusText when the JSON body is not an object', async () => {
    const response = makeResponse(400, 'Bad Request', 'plain string body');
    const result = await extractError(response);
    expect(result.message).toBe('Bad Request');
  });
});

describe('handleError', () => {
  it('returns an ApiServiceError unchanged (idempotent, no double-wrap)', () => {
    const original = new ApiServiceError({
      message: 'Already wrapped',
      statusCode: 400,
    });
    const result = handleError(original);
    expect(result).toBe(original);
  });

  it('wraps a plain object with a statusCode into ApiServiceError', () => {
    const result = handleError({ statusCode: 403, message: 'Forbidden' });
    expect(result).toBeInstanceOf(ApiServiceError);
    expect(result.statusCode).toBe(403);
  });

  it('wraps a generic Error, mapping AbortError to a 408 timeout', () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    const result = handleError(abortError);
    expect(result).toBeInstanceOf(ApiServiceError);
    expect(result.statusCode).toBe(408);
    expect(result.message).toBe('The operation was aborted');
  });

  it('wraps a generic Error without a statusCode when it is not an AbortError', () => {
    const result = handleError(new Error('Network down'));
    expect(result.statusCode).toBeUndefined();
    expect(result.message).toBe('Network down');
  });

  it('falls back to a generic message for a completely unknown error shape', () => {
    const result = handleError('just a string, not an Error instance');
    expect(result.message).toBe('An unexpected error occurred');
  });
});
