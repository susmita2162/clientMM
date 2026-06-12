// src/utils/claimAdapters.ts
//
// Single adapter for all three halted-claim endpoints:
//   POST /api/client-match/claim-match-action/nextHalted
//   GET  /api/clientMatch/claim/findByClaimId/:id
//   GET  /api/clientMatch/claim/findByClientClaimId/:id
//
// All three now return the same flat HaltedClaimApiResponse shape.
//
// Fields with no backend source:
//   serviceDate — not in API response → ''
//   policy      — not in API response → ''
//   sender      — not in API response → ''

import type { HaltedClaim, HaltedClaimApiResponse } from '../types/claims';

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Extracts a named value from additionalInfo.info[].
 * Returns empty string when absent — safe for all string fields.
 */
function getInfoValue(response: HaltedClaimApiResponse, name: string): string {
  return (
    response.additionalInfo?.info?.find((i) => i.name === name)?.value ?? ''
  );
}

/**
 * Builds a display address string from an address sub-object.
 * Returns empty string when address is absent.
 */
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
 * Field priority rules:
 *   Personal info (name, DOB, gender, address) — patient first, insured fallback.
 *   insuredId — always from insured.insuredID (identifier, not personal info).
 *
 * Fields not provided by the backend default to '':
 *   serviceDate, policy, sender
 *
 * claimNumber: prefers response.claimNumber; falls back to header.claimNumber
 *   (nextHalted envelope) when claimNumber is absent.
 */
export function adaptHaltedClaimResponse(
  response: HaltedClaimApiResponse
): HaltedClaim {
  const insured = response.insured;
  const patient = response.patient;

  // ── Patient personal info — insured fields are fallbacks only ───────────────
  const firstName = patient?.firstName ?? insured?.firstName ?? '';
  const lastName = patient?.lastName ?? insured?.lastName ?? '';
  const middleName = patient?.middleName ?? insured?.middleName ?? '';
  const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

  const dateOfBirth = patient?.dateOfBirth ?? insured?.dateOfBirth ?? '';
  const gender = patient?.gender ?? insured?.gender ?? '';
  const address =
    buildAddress(patient?.address) || buildAddress(insured?.address);
  // ────────────────────────────────────────────────────────────────────────────

  const scenario = getInfoValue(response, 'scenario');
  const matchType = getInfoValue(response, 'matchType') || 'HALT';

  const userPend = response.userPend ?? 'N';
  const category: HaltedClaim['category'] =
    userPend === 'Y' ? 'MANUAL_REVIEW_PENDED' : 'MANUAL_REVIEW';

  // claimNumber: root field takes priority; header envelope is the fallback
  // for nextHalted responses where claimNumber may live in header only.
  const claimNumber = String(
    response.claimNumber ?? response.header?.claimNumber ?? ''
  );

  return {
    claimNumber,
    clientClaimId: response.clientClaimNumber ?? '',
    claimStream: response.lineOfBusiness ?? '',
    claimType: (response.claimType ?? 'H') === 'U' ? 'U' : 'H',
    dateOfReceipt: response.clientReceivedDate ?? response.receivedDate ?? '',

    // Not provided by backend — defaulted to '' intentionally.
    serviceDate: '',
    policy: '',
    sender: '',

    // insuredId is an identifier — always from insured, not patient.
    insuredId: insured?.insuredID ?? '',
    ccode: response.clientCode ?? '',
    group: response.employer?.employerGroupName ?? '',
    // payor is a plain string on all three responses (not a payer object).
    payer: response.payor ?? '',
    network: response.lineOfBusiness ?? '',

    // Patient personal info
    name,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    address,

    // relationship lives on insured only per the API schema.
    relationship: insured?.relationToPatient ?? '',
    category,
    status: 'HALTED',
    lockedBy: null,
    lockedAt: null,
    pendedClaim: userPend,
    pendNotes: response.pendNotes ?? [],
    scenario,
    matchType,
  };
}

/**
 * Named alias used by ClientManualMatchDashboard (nextHalted queue path).
 * Both names call the same function — no duplication of logic.
 */
export const adaptNextHaltedToHaltedClaim = adaptHaltedClaimResponse;
