// src/types/claims.ts
// Type definitions for Claims data
// PHASE-2 UPDATE: NextHaltedClaimRequest/Response added to match live
//   POST /api/client-match/claim-match-action/nextHalted (claim-match service)

/**
 * Search criteria for claims
 */
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
// QUEUE MANAGEMENT TYPES
// ============================================================================

/**
 * Request body for POST /api/client-match/claim-match-action/nextHalted
 * Field names match live swagger (NextHaltedClaimRequest schema).
 */
export interface NextHaltedClaimRequest {
  lockedByUser: string;
  lockExpiration: number; // int32
  network: string;
  pended: boolean;
  claimType: string;
}

/**
 * Response from POST /api/client-match/claim-match-action/nextHalted
 * Flat structure — all fields are top-level strings/numbers.
 * Field names match live swagger (NextHaltedClaimResponse schema) exactly.
 *
 * NOTE: claimNumber is string (not int64) — confirmed from live swagger.
 */
export interface NextHaltedClaimResponse {
  claimNumber: string;
  claimId: string;
  clientClaimId: string;
  network: string;
  status: string;
  insuredId: string;
  insuredFullName: string;
  insuredFirstName: string;
  insuredLastName: string;
  insuredGender: string;
  insuredAddress1: string;
  insuredCityStateZip: string;
  insuredDob: string;
  memberDob: string;
  payerName: string;
  scenario: string;
  category: string;
  claimType: string;
  claimStream: string;
  relationship: string;
  policyNum: string;
  matchType: string;
  pendedClaim: string;
  matchActionId: number; // int64
  message: string;
  ccode: string;
  dateOfService: string;
  receiptDate: string; // date-time
  grpName: string;
  sender: string;
}

/**
 * @deprecated Use NextHaltedClaimRequest + getNextHaltedClaim() for live mode.
 * Kept for backward compatibility with existing queue management code.
 */
export interface QueueParams {
  claimStream: string;
  category: 'MANUAL_REVIEW' | 'MANUAL_REVIEW_PENDED';
  claimType: 'HCFA' | 'UB';
  userId?: string;
}

/**
 * HaltedClaim — flat shape used by mock data and existing UI components.
 * Field names do NOT yet match the live NextHaltedClaimResponse — this
 * mapping is parked pending Claim Information panel alignment.
 */
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
}

/**
 * Claim search result — used by findByClaimId / findByClientClaimId.
 */
export interface ClaimSearchResult {
  found: boolean;
  claim?: HaltedClaim;
  error?: 'NOT_FOUND' | 'LOCKED' | 'NOT_HALTED';
  message?: string;
}

/**
 * @deprecated Use NextHaltedClaimResponse for live mode.
 */
export interface QueueClaimResponse {
  claim: HaltedClaim | null;
  queueKey: string;
  message?: string;
}

// ============================================================================
// CLAIM PROFILE MANAGEMENT TYPES
// Field names match live swagger schemas exactly.
// ============================================================================

/**
 * POST /api/client-match/claim-match-action/pend
 * Pend or unpend a claim and optionally add notes.
 */
export interface PendClaimRequest {
  claimNumber: string;
  claimType: string;
  userName: string;
  pendNotes: string;
  pended: boolean;
  lockExpiration: number; // int32
  network: string;
}

/**
 * POST /api/client-match/claim-match-action/deny
 */
export interface DenyDecisionRequest {
  claimNumber: string;
  clientClaimNumber: string;
  claimType: string;
  userName: string;
  denialReason: string;
}

/**
 * POST /api/client-match/claim-match-action/claim/updateCcode
 */
export interface UpdateCcodeRequest {
  policy: string;
  ccode: string;
  policyAlias: string;
  forceCcode: boolean;
  serviceDate: string; // date-time
  receiptDate: string; // date-time
  claimNumber: string;
  claimType: string;
  statusCode: string;
  lockedByUser: string;
  eligMemberId: number; // int64
  ccodeRecId: number; // int64
  forcePolicy: boolean;
}

/**
 * POST /api/client-match/claim-match-action/claim/reset
 */
export interface ResetSearchRequest {
  claimType: string;
  network: string;
  statusCode: number; // int64
  pended: boolean;
}

/**
 * Response shape for deny and updateCcode (200).
 * Pend and reset return empty {} on 200 — modelled as Promise<void>.
 */
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
// DENIAL REASON TYPES
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

export interface DenialReasonsResponse {
  denialReasons: DenialReason[];
}

// ============================================================================
// MEMBER SEARCH TYPES
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
