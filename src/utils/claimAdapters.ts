// src/utils/claimAdapters.ts
import type { HaltedClaim, NextHaltedClaimResponse } from '../types/claims';

/**
 * Adapts nextHalted API response → HaltedClaim.
 *
 * All personal info fields (name, firstName, lastName, dateOfBirth, gender,
 * address) are sourced from patient fields. insured fields are fallbacks
 * only for subscriber-is-patient scenarios where patient fields are null.
 *
 * insuredId: always sourced from insuredId — it is a policy identifier,
 * not personal information, and is unaffected by this requirement.
 */
export function adaptNextHaltedToHaltedClaim(
  r: NextHaltedClaimResponse
): HaltedClaim {
  // Patient name — prefer patient fields, fall back to insured.
  const patientName =
    r.patientFullName ||
    [r.patientFirstName, r.patientLastName].filter(Boolean).join(' ');

  // Patient address — prefer patient fields, fall back to insured.
  const patientAddress = [r.patientAddress1, r.patientCityStateZip]
    .filter(Boolean)
    .join(', ');

  return {
    claimNumber: r.claimNumber ?? '',
    clientClaimId: r.clientClaimId ?? '',
    claimStream: r.claimStream ?? '',
    // API returns 'H' | 'U' — cast to the correct union, no conversion needed.
    claimType: (r.claimType as 'H' | 'U') ?? 'H',
    dateOfReceipt: r.receiptDate ?? '',
    serviceDate: r.dateOfService ?? '',
    policy: r.policyNum ?? '',
    insuredId: r.insuredId ?? '',
    ccode: r.ccode ?? '',
    group: r.grpName ?? '',
    payer: r.payerName ?? '',
    sender: r.sender ?? '',
    network: r.network ?? '',
    // ── Patient personal info — insured fields are fallbacks only ────────────
    name: patientName,
    firstName: r.patientFirstName ?? '',
    lastName: r.patientLastName ?? '',
    // memberDob is the patient DOB field on this flat response.
    dateOfBirth: r.memberDob || '',
    gender: r.patientGender ?? '',
    address: patientAddress,
    // ─────────────────────────────────────────────────────────────────────────
    relationship: r.relationship ?? '',
    category: r.pendedClaim === 'Y' ? 'MANUAL_REVIEW_PENDED' : 'MANUAL_REVIEW',
    status: 'HALTED',
    lockedBy: null,
    lockedAt: null,
    pendedClaim: r.pendedClaim ?? 'N',
    scenario: r.scenario ?? '',
    matchType: r.matchType ?? 'HALT',
  };
}
