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
// All three endpoints now return the same flat shape:
//   POST /api/client-match/claim-match-action/nextHalted
//   GET  /api/clientMatch/claim/findByClaimId/:id
//   GET  /api/clientMatch/claim/findByClientClaimId/:id
//
// Field notes:
//   payor            — plain string (not a payer object)
//   userPend         — 'Y' | 'N' pend indicator
//   pendNotes[]      — structured historical notes
//   header           — envelope present on nextHalted only; optional here so
//                      the same type covers all three responses without casting
//   status           — envelope present on nextHalted only; optional for same reason
//   claimType        — 'H' (HCFA) | 'U' (UB)
//   additionalInfo   — name/value pairs: scenario, matchType, reasonCode, etc.
//
// Fields NOT provided by backend (kept as optional so adapters can default them):
//   dateOfService / serviceDate — not in any current response
//   policyNum / policy          — not in any current response
//   sender                      — not in any current response
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
 * Unified flat response shape shared by all three halted-claim endpoints.
 *
 * nextHalted also returns a `header` and `status` envelope — those fields
 * are optional here so the same type covers findByClaimId responses too.
 */
export interface HaltedClaimApiResponse {
  // ── Envelope (nextHalted only) ──────────────────────────────────────────────
  header?: {
    claimNumber?: string | null;
  } | null;
  status?: {
    statusCode?: string | null;
    description?: string | null;
    receivedTime?: string | null;
    responseTime?: string | null;
  } | null;

  // ── Claim identifiers ───────────────────────────────────────────────────────
  claimType?: string | null; // 'H' | 'U'
  claimNumber?: number | string | null;
  clientClaimNumber?: string | null;
  clientReceivedDate?: string | null;
  receivedDate?: string | null;
  claimOrigin?: string | null;

  // ── Pend ────────────────────────────────────────────────────────────────────
  userPend?: string | null; // 'Y' | 'N'
  pendNotes?: HaltedClaimApiPendNote[] | null;

  // ── Client / policy ─────────────────────────────────────────────────────────
  clientCode?: string | null; // maps to ccode in HaltedClaim

  // ── Sub-objects ─────────────────────────────────────────────────────────────
  insured?: HaltedClaimApiInsured | null;
  patient?: HaltedClaimApiPatient | null;
  employer?: HaltedClaimApiEmployer | null;

  // ── Payer / network ─────────────────────────────────────────────────────────
  /** Plain string — not a payer object. */
  payor?: string | null;
  lineOfBusiness?: string | null;

  // ── Additional info ─────────────────────────────────────────────────────────
  additionalInfo?: {
    info?: HaltedClaimApiInfoItem[];
  } | null;

  /**
   * nextHalted wraps all claim fields inside claimInfo{}.
   * findByClaimId / findByClientClaimId return the same fields flat at root.
   * adaptHaltedClaimResponse normalises both shapes — components see HaltedClaim only.
   */
  claimInfo?: {
    userPend?: string | null;
    pendNotes?: HaltedClaimApiPendNote[] | null;
    clientClaimNumber?: string | null;
    clientReceivedDate?: string | null;
    claimType?: string | null;
    claimNumber?: number | string | null;
    claimOrigin?: string | null;
    receivedDate?: string | null;
    clientCode?: string | null;
    insured?: HaltedClaimApiInsured | null;
    patient?: HaltedClaimApiPatient | null;
    employer?: HaltedClaimApiEmployer | null;
    payor?: string | null;
    lineOfBusiness?: string | null;
    additionalInfo?: {
      info?: HaltedClaimApiInfoItem[];
    } | null;
  } | null;
}

// ── Keep FindByClaimIdLiveResponse as an alias so claimsApi.ts import compiles
//    without a separate change to that file's import list.
/** @deprecated Use HaltedClaimApiResponse. Alias kept for claimsApi.ts compatibility. */
export type FindByClaimIdLiveResponse = HaltedClaimApiResponse;

/** @deprecated Use HaltedClaimApiResponse. Alias kept for claimsApi.ts compatibility. */
export type NextHaltedClaimResponse = HaltedClaimApiResponse;

// ============================================================================
// HALTED CLAIM — INTERNAL FLAT SHAPE
//
// Adapted from HaltedClaimApiResponse by adaptHaltedClaimResponse().
//
// claimType: 'H' | 'U' — stored as-is; used in action payloads without conversion.
// Personal info (name, DOB, gender, address) — patient first, insured fallback.
// insuredId — always from insured.insuredID (identifier, not personal info).
//
// Fields with no backend source default to '':
//   serviceDate, policy, sender
// ============================================================================

export interface HaltedClaim {
  claimNumber: string;
  clientClaimId: string;
  claimStream: string;
  /** API value: 'H' (HCFA) or 'U' (UB). Used as-is in action payloads. */
  claimType: 'H' | 'U';
  dateOfReceipt: string;
  /** Not provided by backend — always ''. Kept for MFE criteria shape compat. */
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
