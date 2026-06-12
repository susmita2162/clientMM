// src/utils/claimAdapters.ts
import type {
  HaltedClaim,
  NextHaltedClaimResponse,
  NextHaltedClaimInfo,
} from '../types/claims';

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Extracts a named value from claimInfo.additionalInfo.info[].
 * Returns empty string when not present — safe to use in string fields.
 */
function getInfoValue(claimInfo: NextHaltedClaimInfo, name: string): string {
  return (
    claimInfo.additionalInfo?.info?.find((i) => i.name === name)?.value ?? ''
  );
}

/**
 * Builds a display address string from a patient or insured address sub-object.
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

// ── adaptNextHaltedToHaltedClaim ──────────────────────────────────────────────

/**
 * Adapts the NEW nested nextHalted API response → HaltedClaim.
 *
 * Response shape (post-update):
 *   response.header.claimNumber  — EDP claim number
 *   response.claimType           — top-level mirror
 *   response.claimInfo           — all claim/patient/insured/employer data
 *     .userPend                  — 'Y' | 'N' (was: top-level pendedClaim)
 *     .pendNotes[]               — structured notes (noteText, creationDate…)
 *     .insured                   — insuredID, address, gender, relationToPatient
 *     .patient                   — patient personal info (priority over insured)
 *     .employer                  — employerGroupName, employerGroupNumber
 *     .payor                     — payer name string (not an object)
 *     .lineOfBusiness            — maps to claimStream / network
 *     .additionalInfo.info[]     — name/value pairs: scenario, matchType, etc.
 *
 * Field priority rules (unchanged from previous adapter):
 *   - Personal info (name, DOB, gender, address) → patient first, insured fallback.
 *   - insuredId → always from insured.insuredID (identifier, not personal info).
 */
export function adaptNextHaltedToHaltedClaim(
  response: NextHaltedClaimResponse
): HaltedClaim {
  const ci = response.claimInfo;
  const insured = ci.insured ?? {};
  const patient = ci.patient ?? {};

  // ── Patient personal info — insured fields are fallbacks only ───────────────
  const firstName = patient.firstName ?? insured.firstName ?? '';
  const lastName = patient.lastName ?? insured.lastName ?? '';
  const middleName = patient.middleName ?? insured.middleName ?? '';
  const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

  const dateOfBirth = patient.dateOfBirth ?? insured.dateOfBirth ?? '';
  const gender = patient.gender ?? insured.gender ?? '';
  const address =
    buildAddress(patient.address) || buildAddress(insured.address);
  // ────────────────────────────────────────────────────────────────────────────

  const scenario = getInfoValue(ci, 'scenario');
  const matchType = getInfoValue(ci, 'matchType') || 'HALT';

  // category derives from userPend (new field, replaces top-level pendedClaim).
  const userPend = ci.userPend ?? 'N';
  const category: HaltedClaim['category'] =
    userPend === 'Y' ? 'MANUAL_REVIEW_PENDED' : 'MANUAL_REVIEW';

  return {
    // Claim identifiers — prefer claimInfo fields; fall back to header envelope.
    claimNumber: String(ci.claimNumber ?? response.header.claimNumber ?? ''),
    clientClaimId: ci.clientClaimNumber ?? '',
    claimStream: ci.lineOfBusiness ?? '',
    claimType: (ci.claimType ?? response.claimType ?? 'H') === 'U' ? 'U' : 'H',
    dateOfReceipt: ci.clientReceivedDate ?? ci.receivedDate ?? '',
    // nextHalted response does not carry line-level service dates.
    serviceDate: r.dateOfService ?? '', // Double check
    policy: r.policyNum ?? '', // Double check
    // insuredId is an identifier — always sourced from insured, not patient.
    insuredId: insured.insuredID ?? '',
    ccode: ci.clientCode ?? '',
    group: ci.employer?.employerGroupName ?? '',
    // payor is a plain string on this response (not a payer object).
    payer: ci.payor ?? '',
    sender: ci.sender ?? '', // Double check
    network: ci.lineOfBusiness ?? '',

    // Patient personal info
    name,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    address,

    relationship: insured.relationToPatient ?? '',
    category,
    status: 'HALTED',
    lockedBy: null,
    lockedAt: null,
    pendedClaim: userPend,
    pendNotes: ci.pendNotes ?? [],
    scenario,
    matchType,
  };
}
