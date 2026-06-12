// src/types/claims.ts

// ============================================================================
// SEARCH / FILTER
// ============================================================================

export interface ClaimsSearchCriteria {
  claimNumber?: string;
  clientClaimId?: string;
}

export interface ClaimStreamData {
  claimStream: string;
  totalClaimCount: number;
  manualMatchwithHCFA: string;
  manualMatchPendedwithHCFA: string;
  manualMatchwithUB: string;
  manualMatchPendedwithUB: string;
}

export interface ClaimsResponse {
  reviewclaimsCountMap: ClaimStreamData[];
}

// ============================================================================
// NEXT HALTED CLAIM
// POST /api/client-match/claim-match-action/nextHalted
// ============================================================================

export interface NextHaltedClaimRequest {
  lockedByUser: string;
  lockExpiration: number; // int32
  network: string;
  pended: boolean;
  claimType: string;
}

// ── New nested response shape ─────────────────────────────────────────────────
// As of the updated API the response is no longer flat.
// claimInfo contains all claim/patient/insured data.
// additionalInfo.info[] carries scenario, matchType, reasonCode, etc.
// userPend replaces pendedClaim; pendNotes replaces the top-level array.
// ─────────────────────────────────────────────────────────────────────────────

export interface NextHaltedPendNote {
  noteText: string;
  creationDate: string;
  createdBy: string;
  modificationDate: string | null;
  modifiedBy: string | null;
}

export interface NextHaltedInsured {
  insuredID: string | null;
  lastName: string | null;
  firstName: string | null;
  middleName: string | null;
  dateOfBirth: string | null;
  relationToPatient: string | null;
  address: {
    street1: string | null;
    street2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  gender: string | null;
}

export interface NextHaltedPatient {
  patientID: string | null;
  lastName: string | null;
  firstName: string | null;
  middleName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: {
    street1: string | null;
    street2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
}

export interface NextHaltedEmployer {
  employerGroupName: string | null;
  employerGroupNumber: string | null;
}

export interface NextHaltedInfoItem {
  name: string;
  value: string;
}

export interface NextHaltedClaimInfo {
  userPend: string | null; // 'Y' | 'N'
  pendNotes: NextHaltedPendNote[] | null;
  clientClaimNumber: string | null;
  clientReceivedDate: string | null;
  claimType: string | null; // 'H' | 'U'
  claimNumber: number | string | null;
  claimOrigin: string | null;
  receivedDate: string | null;
  clientCode: string | null;
  insured: NextHaltedInsured | null;
  patient: NextHaltedPatient | null;
  employer: NextHaltedEmployer | null;
  payor: string | null;
  lineOfBusiness: string | null;
  additionalInfo: {
    info: NextHaltedInfoItem[];
  } | null;
}

/**
 * New nested response shape returned by
 * POST /api/client-match/claim-match-action/nextHalted
 *
 * header.claimNumber — the EDP claim number returned in the envelope.
 * status.statusCode  — 'C' = success.
 * claimType          — top-level mirror of claimInfo.claimType.
 * claimInfo          — all claim data; replaces the previous flat fields.
 */
export interface NextHaltedClaimResponse {
  header: {
    claimNumber: string;
  };
  status: {
    statusCode: string;
    description: string;
    receivedTime: string;
    responseTime: string;
  };
  claimType: string | null;
  claimInfo: NextHaltedClaimInfo;
}

// ============================================================================
// FIND BY CLAIM ID — LIVE RESPONSE
// GET /api/clientMatch/claim/findByClaimId/:id
// GET /api/clientMatch/claim/findByClientClaimId/:id
// ============================================================================

export interface FindByClaimIdAddress {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface FindByClaimIdInsured {
  insuredID?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  dateOfBirth?: string | null;
  relationToPatient?: string | null;
  address?: FindByClaimIdAddress | null;
  gender?: string | null;
}

export interface FindByClaimIdPatient {
  patientID?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: FindByClaimIdAddress | null;
}

export interface FindByClaimIdEmployer {
  employerGroupName?: string | null;
  employerGroupNumber?: string | null;
}

export interface FindByClaimIdPayer {
  payerId?: string | null;
  payerName?: string | null;
  payerLocation?: string | null;
  address?: FindByClaimIdAddress | null;
}

/** One entry in additionalInfo.info[] — scenario, matchType, reasonCode etc. */
export interface FindByClaimIdInfoItem {
  name: string;
  value: string;
}

export interface FindByClaimIdAdditionalInfo {
  info?: FindByClaimIdInfoItem[];
}

export interface FindByClaimIdLineItem {
  serviceFromDate?: string | null;
  serviceToDate?: string | null;
}

export interface FindByClaimIdLineGroup {
  line?: FindByClaimIdLineItem[];
}

/**
 * Complete live response shape from swagger.
 * claimType: "H" = HCFA, "U" = UB — stored as-is in HaltedClaim.claimType.
 * claimNumber: int64 from live API.
 * clientCode: maps to ccode in HaltedClaim.
 * additionalInfo.info[] contains scenario, matchType, reasonCode, stc0101, etc.
 */
export interface FindByClaimIdLiveResponse {
  clientClaimNumber?: string | null;
  clientReceivedDate?: string | null; // date-time
  claimType?: string | null; // "H" | "U"
  claimNumber?: number | string | null; // int64
  claimOrigin?: string | null;
  receivedDate?: string | null;
  clientCode?: string | null; // maps to ccode in HaltedClaim
  lines?: FindByClaimIdLineGroup | null;
  insured?: FindByClaimIdInsured | null;
  patient?: FindByClaimIdPatient | null;
  employer?: FindByClaimIdEmployer | null;
  payer?: FindByClaimIdPayer | null;
  lineOfBusiness?: string | null;
  additionalInfo?: FindByClaimIdAdditionalInfo | null;
  /** Pend indicator — 'Y' | 'N'. Maps to HaltedClaim.pendedClaim. */
  userPend?: string | null;
  /** Historical pend notes. Array of string-keyed objects per swagger schema. */
  pendNotes?: Record<string, string>[] | null;
}

// ============================================================================
// HALTED CLAIM — INTERNAL FLAT SHAPE
// Adapted from NextHaltedClaimResponse and FindByClaimIdLiveResponse.
//
// claimType: 'H' | 'U' — API values, used directly in action payloads.
//   'H' = HCFA, 'U' = UB.
//   Both adapters (adaptNextHaltedToHaltedClaim, adaptFindByClaimIdResponse)
//   store the raw API value — no conversion. ClaimInfoGrid renders it as-is.
//
// Personal info fields (name, firstName, lastName, dateOfBirth, gender,
// address) are sourced from the patient object in both adapters.
// insured fields serve as fallbacks for subscriber-is-patient scenarios.
// insuredId always comes from the insured object — it is an identifier,
// not personal information.
// ============================================================================

export interface HaltedClaim {
  claimNumber: string;
  clientClaimId: string;
  claimStream: string;
  /** API value: 'H' (HCFA) or 'U' (UB). Used as-is in action payloads. */
  claimType: 'H' | 'U';
  dateOfReceipt: string;
  serviceDate: string;
  policy: string;
  insuredId: string;
  ccode: string;
  group: string;
  payer: string;
  sender: string;
  network: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  relationship: string;
  address: string;
  category: 'MANUAL_REVIEW' | 'MANUAL_REVIEW_PENDED';
  status: 'HALTED' | 'LOCKED' | 'PROCESSING';
  lockedBy: string | null;
  lockedAt: string | null;
  /** 'Y' = already pended, 'N' = not yet pended. Drives button state. */
  pendedClaim?: string;
  /**
   * Historical pend notes from API response. Displayed in PendDialog upper section.
   * NextHaltedPendNote[] from nextHalted; Record<string,string>[] from findByClaimId.
   * PendDialog accepts string for display — ClaimInformationPanel formats before passing.
   */
  pendNotes?: NextHaltedPendNote[] | Record<string, string>[];
  /** Scenario code (e.g. "INSID LN3"). Drives MFE field highlighting. */
  scenario?: string;
  /** Always 'HALT' for halted claims. */
  matchType?: string;
}

export interface ClaimSearchResult {
  found: boolean;
  claim?: HaltedClaim;
  error?: 'NOT_FOUND' | 'LOCKED' | 'NOT_HALTED';
  message?: string;
}

// ============================================================================
// CLAIM ACTION REQUESTS
// ============================================================================

export interface PendClaimRequest {
  claimNumber: string;
  claimType: string;
  userName: string;
  pendNotes: string;
  pended: boolean;
  lockExpiration: number;
  network: string;
}

export interface DenyDecisionRequest {
  claimNumber: string;
  clientClaimNumber: string;
  claimType: string;
  userName: string;
  denialReason: string;
}

export interface UpdateCcodeRequest {
  policy: string;
  ccode: string;
  policyAlias: string;
  forceCcode: boolean;
  serviceDate: string;
  receiptDate: string;
  claimNumber: string;
  claimType: string;
  statusCode: string;
  lockedByUser: string;
  eligMemberId: number;
  ccodeRecId: number;
  forcePolicy: boolean;
}

export interface ResetSearchRequest {
  claimType: string;
  network: string;
  statusCode: number;
  pended: boolean;
}

export interface ClaimActionResponse {
  header: {
    requestId: string;
    claimNumber: string;
  };
  status: {
    statusCode: string;
    description: string;
    errorCode: string;
    errorMessage: string;
    receivedTime: string;
    responseTime: string;
  };
}

// ============================================================================
// UPDATE CCODE RESPONSE — discriminated union
// The updateCcode endpoint returns HTTP 200 for both success and ALERT cases.
// ALERT means the ccode is not effective for the date of service.
// ClaimActionResponse.status is an object; UpdateCcodeAlertResponse.status is
// the string 'ALERT' — the equality check is unambiguous across both shapes.
// ============================================================================

export interface UpdateCcodeAlertResponse {
  status: 'ALERT';
  message: string;
  parameters: {
    invalid: string; // 'ccode' when the ccode check fails
    forceCcode: boolean;
    forcePolicy: boolean;
  };
  errors: Record<string, unknown>;
}

export type UpdateCcodeResult =
  | { type: 'success'; data: ClaimActionResponse }
  | { type: 'alert'; data: UpdateCcodeAlertResponse };

// ============================================================================
// DENIAL REASONS
// ============================================================================

/**
 * Denial reason for UI consumption.
 *
 * Live API (GET /api/client-match/claim-match-action/denial-reasons) returns
 * a plain string[] e.g. ["Insufficient patient data to reprice.", ...].
 * claimsApi.getDenialReasons() normalizes that to { value, label } so the
 * UI dropdown contract does not change.
 *
 * Mock route mirrors the same normalization — returns plain string[].
 */
export interface DenialReason {
  value: string;
  label: string;
}

// ============================================================================
// MEMBER / EMPLOYER GROUP SEARCH
// ============================================================================

export interface MemberSearchParams {
  insuredId: string;
  network: string;
}

export interface MemberSearchResult {
  memberId: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  network: string;
  policyId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  relationship: string;
  effectiveDate: string;
  terminationDate?: string | null;
}

// ============================================================================
// EMPLOYER GROUP SEARCH TYPES
// ============================================================================

export interface EmployerGroupSearchParams {
  insuredId: string;
  network: string;
}

export interface EmployerGroupSearchResult {
  groupId: string;
  groupName: string;
  employerName: string;
  network: string;
  effectiveDate: string;
  terminationDate?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  memberCount: number;
  planType: string;
}
