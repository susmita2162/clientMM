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

/**
 * Flat response — all top-level, all nullable (live API).
 * matchType is always 'HALT'. scenario drives MFE field highlighting.
 * pendedClaim: 'Y' | 'N' — drives Pend Claim / Pend Notes button state.
 */
export interface NextHaltedClaimResponse {
  claimNumber: string;
  claimId: string;
  clientClaimId: string;
  network: string | null;
  status: string | null;
  insuredId: string | null;
  insuredFullName: string | null;
  insuredFirstName: string | null;
  insuredLastName: string | null;
  insuredGender: string | null;
  insuredAddress1: string | null;
  insuredCityStateZip: string | null;
  insuredDob: string | null;
  memberDob: string | null;
  payerName: string | null;
  scenario: string | null;
  category: string | null;
  claimType: string | null;
  claimStream: string | null;
  relationship: string | null;
  policyNum: string | null;
  matchType: string | null; // always 'HALT'
  pendedClaim: string | null; // 'Y' | 'N'
  matchActionId: number; // int64
  message: string | null;
  ccode: string | null;
  dateOfService: string | null;
  receiptDate: string | null;
  grpName: string | null;
  sender: string | null;
}

// ============================================================================
// FIND BY CLAIM ID — LIVE RESPONSE
// GET /api/clientMatch/claim/findByClaimId/:id
// GET /api/clientMatch/claim/findByClientClaimId/:id
//
// Full schema from swagger (images 1-3).
// claimsApi.adaptFindByClaimIdResponse() flattens this to HaltedClaim.
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
 * claimType: "H" = HCFA, "U" = UB.
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
}

// ============================================================================
// HALTED CLAIM — INTERNAL FLAT SHAPE
// Adapted from NextHaltedClaimResponse and FindByClaimIdLiveResponse
// by claimsApi.ts. Consumed by ClaimInfoGrid, ClaimInformationPanel, etc.
// ============================================================================

export interface HaltedClaim {
  claimNumber: string;
  clientClaimId: string;
  claimStream: string;
  claimType: 'HCFA' | 'UB';
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
