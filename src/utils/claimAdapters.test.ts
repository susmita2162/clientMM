// src/utils/claimAdapters.test.ts
import { describe, it, expect } from 'vitest';
import { adaptHaltedClaimResponse } from '../../src/utils/claimAdapters';
import type { HaltedClaimApiResponse } from '../../src/types/claims';

// Minimal fixture builder — only the fields adaptHaltedClaimResponse reads.
// Cast through unknown to avoid needing every optional field the real API
// type declares; this mirrors what the live/mock endpoints actually send.
function buildResponse(
  overrides: Record<string, unknown> = {}
): HaltedClaimApiResponse {
  return {
    header: { claimNumber: 'HEADER-FALLBACK-123' },
    claimInfo: {
      claimNumber: '272120489',
      clientClaimNumber: 'CLI-998',
      lineOfBusiness: 'HEOS',
      claimType: 'H',
      clientReceivedDate: '01-15-2026',
      serviceDate: '01-10-2026',
      clientCode: 'CC01',
      payor: 'ACME Payor',
      userPend: 'N',
      insured: { insuredID: 'INS-001', relationToPatient: 'Self' },
      patient: {
        firstName: 'Jane',
        middleName: '',
        lastName: 'Doe',
        dateOfBirth: '05-20-1980',
        gender: 'F',
        address: {
          street1: '123 Main St',
          street2: '',
          city: 'Dallas',
          state: 'TX',
          zip: '75001',
        },
      },
      employer: { employerGroupName: 'Acme Corp' },
      additionalInfo: {
        info: [
          { name: 'scenario', value: 'DUPLICATE_MEMBER' },
          { name: 'ruleCode', value: 'R-42' },
          { name: 'matchType', value: 'PARTIAL' },
        ],
      },
      pendNotes: [],
      ...overrides,
    },
  } as unknown as HaltedClaimApiResponse;
}

describe('adaptHaltedClaimResponse', () => {
  it('maps core claim identifiers from claimInfo', () => {
    const result = adaptHaltedClaimResponse(buildResponse());

    expect(result.claimNumber).toBe('272120489');
    expect(result.clientClaimId).toBe('CLI-998');
    expect(result.claimStream).toBe('HEOS');
    expect(result.claimType).toBe('H');
    expect(result.insuredId).toBe('INS-001');
    expect(result.ccode).toBe('CC01');
    expect(result.group).toBe('Acme Corp');
    expect(result.payer).toBe('ACME Payor');
  });

  it('builds a full display name from patient first/middle/last', () => {
    const result = adaptHaltedClaimResponse(buildResponse());
    expect(result.name).toBe('Jane Doe');
  });

  it('omits missing middle name from the display name without extra spaces', () => {
    const result = adaptHaltedClaimResponse(
      buildResponse({
        patient: {
          firstName: 'John',
          middleName: '',
          lastName: 'Smith',
          address: null,
        },
      })
    );
    expect(result.name).toBe('John Smith');
  });

  it('builds a combined address string from street/city/state/zip', () => {
    const result = adaptHaltedClaimResponse(buildResponse());
    expect(result.address).toBe('123 Main St, Dallas TX 75001');
  });

  it('returns empty string address when patient has no address', () => {
    const result = adaptHaltedClaimResponse(
      buildResponse({
        patient: { firstName: 'Jane', lastName: 'Doe', address: null },
      })
    );
    expect(result.address).toBe('');
  });

  it('maps userPend "Y" to MANUAL_REVIEW_PENDED category', () => {
    const result = adaptHaltedClaimResponse(buildResponse({ userPend: 'Y' }));
    expect(result.category).toBe('MANUAL_REVIEW_PENDED');
    expect(result.pendedClaim).toBe('Y');
  });

  it('maps userPend "N" (or missing) to MANUAL_REVIEW category', () => {
    const result = adaptHaltedClaimResponse(buildResponse({ userPend: 'N' }));
    expect(result.category).toBe('MANUAL_REVIEW');
  });

  it('reads scenario, ruleCode and matchType from additionalInfo.info[]', () => {
    const result = adaptHaltedClaimResponse(buildResponse());
    expect(result.scenario).toBe('DUPLICATE_MEMBER');
    expect(result.ruleCode).toBe('R-42');
    expect(result.matchType).toBe('PARTIAL');
  });

  it('defaults matchType to "HALT" when not present in additionalInfo', () => {
    const result = adaptHaltedClaimResponse(
      buildResponse({ additionalInfo: { info: [] } })
    );
    expect(result.matchType).toBe('HALT');
  });

  it('falls back to header.claimNumber when claimInfo.claimNumber is absent', () => {
    const result = adaptHaltedClaimResponse(
      buildResponse({ claimNumber: undefined })
    );
    expect(result.claimNumber).toBe('HEADER-FALLBACK-123');
  });

  it('falls back claimType to "U" only when explicitly "U", else defaults to "H"', () => {
    const asU = adaptHaltedClaimResponse(buildResponse({ claimType: 'U' }));
    expect(asU.claimType).toBe('U');

    const asOther = adaptHaltedClaimResponse(
      buildResponse({ claimType: undefined })
    );
    expect(asOther.claimType).toBe('H');
  });

  it('falls back dateOfReceipt to receivedDate when clientReceivedDate is absent', () => {
    const result = adaptHaltedClaimResponse(
      buildResponse({
        clientReceivedDate: undefined,
        receivedDate: '02-01-2026',
      })
    );
    expect(result.dateOfReceipt).toBe('02-01-2026');
  });

  it('always sets status to HALTED and lockedBy/lockedAt to null on fresh fetch', () => {
    const result = adaptHaltedClaimResponse(buildResponse());
    expect(result.status).toBe('HALTED');
    expect(result.lockedBy).toBeNull();
    expect(result.lockedAt).toBeNull();
  });

  it('defaults policy and sender to empty string (no backend source)', () => {
    const result = adaptHaltedClaimResponse(buildResponse());
    expect(result.policy).toBe('');
    expect(result.sender).toBe('');
  });

  it('handles a completely empty claimInfo without throwing', () => {
    const response = {
      header: {},
      claimInfo: {},
    } as unknown as HaltedClaimApiResponse;
    const result = adaptHaltedClaimResponse(response);

    expect(result.claimNumber).toBe('');
    expect(result.name).toBe('');
    expect(result.category).toBe('MANUAL_REVIEW');
  });
});
