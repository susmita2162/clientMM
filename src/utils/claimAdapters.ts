// src/utils/claimAdapters.ts
import type { HaltedClaim, NextHaltedClaimResponse } from '../types/claims';

/** Adapts nextHalted API response → HaltedClaim */
export function adaptNextHaltedToHaltedClaim(
  r: NextHaltedClaimResponse
): HaltedClaim {
  return {
    claimNumber: r.claimNumber ?? '',
    clientClaimId: r.clientClaimId ?? '',
    claimStream: r.claimStream ?? '',
    claimType: (r.claimType as 'HCFA' | 'UB') ?? 'HCFA',
    dateOfReceipt: r.receiptDate ?? '',
    serviceDate: r.dateOfService ?? '',
    policy: r.policyNum ?? '',
    insuredId: r.insuredId ?? '',
    ccode: r.ccode ?? '',
    group: r.grpName ?? '',
    payer: r.payerName ?? '',
    sender: r.sender ?? '',
    network: r.network ?? '',
    name:
      r.insuredFullName ||
      [r.insuredFirstName, r.insuredLastName].filter(Boolean).join(' '),
    firstName: r.insuredFirstName ?? '',
    lastName: r.insuredLastName ?? '',
    dateOfBirth: r.insuredDob || r.memberDob || '',
    gender: r.insuredGender ?? '',
    relationship: r.relationship ?? '',
    address: [r.insuredAddress1, r.insuredCityStateZip]
      .filter(Boolean)
      .join(', '),
    category: r.pendedClaim === 'Y' ? 'MANUAL_REVIEW_PENDED' : 'MANUAL_REVIEW',
    status: 'HALTED',
    lockedBy: null,
    lockedAt: null,
    pendedClaim: r.pendedClaim ?? 'N',
    scenario: r.scenario ?? '',
    matchType: r.matchType ?? 'HALT',
  };
}
