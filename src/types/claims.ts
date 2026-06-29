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
// NEXT HALTED CLAIM REQUEST
// POST /api/client-match/claim-match-action/nextHalted
// ============================================================================

export interface NextHaltedClaimRequest {
  lockedByUser: string;
  lockExpiration: number; // int32
  network: string;
  pended: boolean;
  claimType: string;
}

// ============================================================================
// SHARED HALTED CLAIM API RESPONSE
//
// All three endpoints return the same envelope + claimInfo shape:
//   POST /nextHalted                        (claim-match service)
//   GET  /findByClaimId/{id}               (claim-match service)
//   GET  /findByClientClaimId/{id}         (claim-match service)
//
// All claim fields live inside claimInfo{} on every endpoint.
// The envelope (header, status, claimType) sits at the root.
//
// Field notes:
//   payor          — plain string (not an object)
//   userPend       — 'Y' | 'N' pend indicator
//   serviceDate    — MM-DD-YYYY (e.g. "06-02-2021"); toIsoDate() converts for MFE
//   additionalInfo — name/value pairs: scenario, matchType, reasonCode, etc.
//   policy/sender  — not provided by any endpoint; default to '' in adapter
// ============================================================================

export interface HaltedClaimApiAddress {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface HaltedClaimApiInsured {
  insuredID?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  dateOfBirth?: string | null;
  relationToPatient?: string | null;
  address?: HaltedClaimApiAddress | null;
  gender?: string | null;
}

export interface HaltedClaimApiPatient {
  patientID?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: HaltedClaimApiAddress | null;
}

export interface HaltedClaimApiEmployer {
  employerGroupName?: string | null;
  employerGroupNumber?: string | null;
}

export interface HaltedClaimApiInfoItem {
  name: string;
  value: string;
}

export interface HaltedClaimApiPendNote {
  noteText: string;
  creationDate: string;
  createdBy: string;
  modificationDate?: string | null;
  modifiedBy?: string | null;
}

/**
 * The claim payload nested under claimInfo{} on all three endpoints.
 * Extracted as a named interface so HaltedClaimApiResponse references it
 * directly — no field duplication.
 */
export interface HaltedClaimInfo {
  userPend?: string | null; // 'Y' | 'N'
  serviceDate?: string | null; // MM-DD-YYYY
  pendNotes?: HaltedClaimApiPendNote[] | null;
  clientClaimNumber?: string | null;
  clientReceivedDate?: string | null;
  claimType?: string | null; // 'H' | 'U'
  claimNumber?: number | string | null;
  claimOrigin?: string | null;
  receivedDate?: string | null;
  clientCode?: string | null;
  insured?: HaltedClaimApiInsured | null;
  patient?: HaltedClaimApiPatient | null;
  employer?: HaltedClaimApiEmployer | null;
  /** Plain string — not a payer object. */
  payor?: string | null;
  lineOfBusiness?: string | null;
  additionalInfo?: { info?: HaltedClaimApiInfoItem[] } | null;
}

/**
 * Response envelope shared by all three halted-claim endpoints.
 * Claim data always lives inside claimInfo — adaptHaltedClaimResponse reads it there.
 */
export interface HaltedClaimApiResponse {
  header?: { claimNumber?: string | null } | null;
  status?: {
    statusCode?: string | null;
    description?: string | null;
    receivedTime?: string | null;
    responseTime?: string | null;
  } | null;
  claimType?: string | null;
  claimInfo?: HaltedClaimInfo | null;
}

// ============================================================================
// HALTED CLAIM — INTERNAL FLAT SHAPE
//
// Adapted from HaltedClaimApiResponse by adaptHaltedClaimResponse().
// All three search endpoints feed this same shape after adaptation.
//
// claimType: 'H' | 'U' — used as-is in action payloads.
// Personal info (name, DOB, gender, address) — patient first, insured fallback.
// insuredId — always from insured.insuredID.
//
// Fields with no backend source default to '':
//   policy, sender
// ============================================================================

export interface HaltedClaim {
  claimNumber: string;
  clientClaimId: string;
  claimStream: string;
  /** API value: 'H' (HCFA) or 'U' (UB). Used as-is in action payloads. */
  claimType: 'H' | 'U';
  dateOfReceipt: string;
  /**
   * From claimInfo.serviceDate (MM-DD-YYYY). Empty string when absent.
   * toIsoDate() in ClientManualMatchDashboard converts for <input type="date">.
   */
  serviceDate: string;
  /** Not provided by backend — always ''. Kept for MFE criteria shape compat. */
  policy: string;
  insuredId: string;
  ccode: string;
  group: string;
  payer: string;
  /** Not provided by backend — always ''. */
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
  /** Historical pend notes. Displayed in PendDialog upper section. */
  pendNotes?: HaltedClaimApiPendNote[];
  /** Scenario code (e.g. "INSID LN3"). Used for tab label suffix display. */
  scenario?: string;
  /**
   * Rule code (e.g. "1502"). Read from additionalInfo.info["ruleCode"].
   * This is the stable key used to look up ScenarioFieldConfig — not the
   * scenario label, which is human-readable and may change.
   */
  ruleCode?: string;
  /** Always 'HALT' for halted claims. */
  matchType?: string;
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
// ============================================================================

export interface UpdateCcodeAlertResponse {
  status: 'ALERT';
  message: string;
  parameters: {
    invalid: string;
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
