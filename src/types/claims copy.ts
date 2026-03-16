// Type definitions for Claims data - UPDATED FOR PHASE-2

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
// QUEUE MANAGEMENT TYPES (Phase 1)
// ============================================================================

/**
 * Queue parameters for fetching next claim
 */
export interface QueueParams {
  claimStream: string; // HEOS, ALC, SAVILITY, XYZ
  category: 'MANUAL_REVIEW' | 'MANUAL_REVIEW_PENDED';
  claimType: 'HCFA' | 'UB';
  userId?: string; // Optional: User requesting the claim (for locking)
}

/**
 * HaltedClaim - Represents a claim that requires manual review
 *
 * Updated in Phase-2 to match actual mock data structure from haltedClaims.json
 */
export interface HaltedClaim {
  // === PRIMARY IDENTIFIERS ===
  claimNumber: string; // Primary key - Claim Number
  clientClaimId: string; // Client's claim ID (searchable)

  // === CLAIM DETAILS ===
  claimStream: string; // HEOS, ALC, SAVILITY, XYZ
  claimType: 'HCFA' | 'UB'; // Form type
  dateOfReceipt: string; // When claim was received
  serviceDate: string; // Date of service

  // === POLICY & COVERAGE ===
  policy: string; // Policy number (maps to 'policyId' in mock data)
  insuredId: string; // Insured member ID
  ccode: string; // Client/employer code
  group: string; // Group name
  payer: string; // Payer name (maps to 'payor' in mock data)
  sender: string; // Sender/provider name
  network: string; // Network identifier

  // === PATIENT INFORMATION ===
  name: string; // Patient name
  dateOfBirth: string; // Patient DOB
  gender: string; // M/F/Other
  relationship: string; // Relationship code (01=Self, 18=Spouse, etc.)
  address: string; // Patient address

  // === QUEUE MANAGEMENT ===
  category: 'MANUAL_REVIEW' | 'MANUAL_REVIEW_PENDED'; // Which review queue
  status: 'HALTED' | 'LOCKED' | 'PROCESSING'; // Locking status
  lockedBy: string | null; // User email/ID who has claim locked
  lockedAt: string | null; // ISO datetime when locked
}

/**
 * Claim search result
 */
export interface ClaimSearchResult {
  found: boolean;
  claim?: HaltedClaim;
  error?: 'NOT_FOUND' | 'LOCKED' | 'NOT_HALTED';
  message?: string;
}

/**
 * Queue claim response (includes locking info)
 * UPDATED FOR PHASE-2
 */
export interface QueueClaimResponse {
  claim: HaltedClaim | null;
  queueKey: string;
  message?: string;
}

// ============================================================================
// MEMBER SEARCH TYPES (Phase 2)
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
// EMPLOYER GROUP SEARCH TYPES (Phase 2)
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
