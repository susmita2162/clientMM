// src/utils/claimAdapters.ts
//
// Single adapter for all three halted-claim endpoints:
//   POST /nextHalted
//   GET  /findByClaimId/{id}
//   GET  /findByClientClaimId/{id}
//
// All three return the same shape: envelope at root, claim fields in claimInfo{}.
// This function reads claimInfo and maps it to the flat HaltedClaim used by the UI.
//
// Fields with no backend source default to '':
//   policy, sender

import type {
  HaltedClaim,
  HaltedClaimApiResponse,
  HaltedClaimInfo,
} from '../types/claims';

// ── Private helpers ───────────────────────────────────────────────────────────

/** Extracts a named value from additionalInfo.info[]. Empty string when absent. */
function getInfoValue(data: HaltedClaimInfo, name: string): string {
  return data.additionalInfo?.info?.find((i) => i.name === name)?.value ?? '';
}

/** Builds a display address string. Empty string when address is absent. */
function buildAddress(
  address:
    | {
        street1?: string | null;
        street2?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
      }
    | null
    | undefined
): string {
  if (!address) return '';
  const line1 = [address.street1, address.street2].filter(Boolean).join(' ');
  const line2 = [address.city, address.state, address.zip]
    .filter(Boolean)
    .join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

// ── adaptHaltedClaimResponse ──────────────────────────────────────────────────

/**
 * Adapts HaltedClaimApiResponse → HaltedClaim.
 *
 * Reads all claim fields from claimInfo (where all 3 endpoints place them).
 * Falls back to header.claimNumber for the claim number when claimInfo.claimNumber
 * is absent (safety net — all current responses include it in claimInfo).
 *
 * Personal info priority: patient first, insured as fallback.
 * insuredId: always from insured.insuredID (identifier, not personal info).
 * serviceDate: passed through as-is (MM-DD-YYYY); toIsoDate() in
 *   ClientManualMatchDashboard converts to YYYY-MM-DD for the MFE date input.
 */
export function adaptHaltedClaimResponse(
  response: HaltedClaimApiResponse
): HaltedClaim {
  const data = response.claimInfo ?? {};

  const insured = data.insured;
  const patient = data.patient;

  const firstName = patient?.firstName ?? '';
  const lastName = patient?.lastName ?? '';
  const middleName = patient?.middleName ?? '';
  const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

  const dateOfBirth = patient?.dateOfBirth ?? '';
  const gender = patient?.gender ?? '';
  const address = buildAddress(patient?.address) ?? '';

  const scenario = getInfoValue(data, 'scenario');
  const matchType = getInfoValue(data, 'matchType') || 'HALT';

  const userPend = data.userPend ?? 'N';
  const category: HaltedClaim['category'] =
    userPend === 'Y' ? 'MANUAL_REVIEW_PENDED' : 'MANUAL_REVIEW';

  // claimInfo.claimNumber is the canonical source; header.claimNumber is the fallback.
  const claimNumber = String(
    data.claimNumber ?? response.header?.claimNumber ?? ''
  );

  return {
    claimNumber,
    clientClaimId: data.clientClaimNumber ?? '',
    claimStream: data.lineOfBusiness ?? '',
    claimType: (data.claimType ?? 'H') === 'U' ? 'U' : 'H',
    dateOfReceipt: data.clientReceivedDate ?? data.receivedDate ?? '',
    serviceDate: data.serviceDate ?? '',
    policy: '',
    sender: '',
    insuredId: insured?.insuredID ?? '',
    ccode: data.clientCode ?? '',
    group: data.employer?.employerGroupName ?? '',
    payer: data.payor ?? '',
    network: data.lineOfBusiness ?? '',
    name,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    address,
    relationship: insured?.relationToPatient ?? '',
    category,
    status: 'HALTED',
    lockedBy: null,
    lockedAt: null,
    pendedClaim: userPend,
    pendNotes: data.pendNotes ?? [],
    scenario,
    matchType,
  };
}
