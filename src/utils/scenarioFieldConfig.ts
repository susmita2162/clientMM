// src/utils/scenarioFieldConfig.ts
//
// Scenario → Field Highlight Configuration
//
// Source: Halt_Claims_Scenarios.xlsx (Search Criteria Prepopulate matrix)
// MATCH_TYPE is always HALT — this config only applies to halted claims.
//
// "Focused and Highlighted" (F+H): field is pre-populated AND highlighted  (memberFocused / employerFocused)
// "Highlighted only"        (H):   field is highlighted but not pre-populated (memberHighlighted / employerHighlighted)
//
// These are passed as props to MemberSearchPanel and EmployerGroupSearchPanel,
// which forward them to their respective MFE widgets so the widgets can
// visually highlight and auto-populate the correct fields.

// ── Field identifier unions ───────────────────────────────────────────────────

/** Field keys recognised by the Member Search MFE widget */
export type MemberSearchField =
  | 'serviceDate'
  | 'network'
  | 'insuredId'
  | 'lastName'
  | 'firstName'
  | 'dateOfBirth'
  | 'gender';

/** Field keys recognised by the Employer Group Search MFE widget */
export type EmployerGroupField =
  | 'network'
  | 'policyAlias'
  | 'groupNameAlias'
  | 'parentCodeDescAlias'
  | 'clientCode';

// ── Config shape ──────────────────────────────────────────────────────────────

export interface ScenarioFieldConfig {
  /** Pre-populated AND highlighted fields in Member Search (Focused + Highlighted) */
  memberFocused: MemberSearchField[];
  /** Highlighted-only fields in Member Search */
  memberHighlighted: MemberSearchField[];
  /** Pre-populated AND highlighted fields in Employer Group Search (Focused + Highlighted) */
  employerFocused: EmployerGroupField[];
  /** Highlighted-only fields in Employer Group Search */
  employerHighlighted: EmployerGroupField[];
}

// ── Shared patterns (avoid duplication) ──────────────────────────────────────

/** Enrollment scenarios: EG is always Highlighted on Policy#/Alias + Network */
const ENROLL_EG_HIGHLIGHTED: EmployerGroupField[] = ['policyAlias', 'network'];

/** Group scenarios: Member Search is always Highlighted on ServiceDate + Network */
const GROUP_MEMBER_HIGHLIGHTED: MemberSearchField[] = [
  'serviceDate',
  'network',
];

// ── Matrix — keyed by NextHaltedClaimResponse.scenario ───────────────────────
//   MATCH_TYPE is always 'HALT'; the scenario value drives field selection.

const SCENARIO_CONFIG: Record<string, ScenarioFieldConfig> = {
  // ── ENROLLMENT category (HALT_ENROLL reason code) ─────────────────────────
  // Member Search → Focused + Highlighted  |  Employer Group → Highlighted

  NEWBORN: {
    memberFocused: ['serviceDate', 'network'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'LN FN': {
    memberFocused: ['serviceDate', 'network', 'lastName', 'firstName'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'FN3 DOB': {
    memberFocused: ['serviceDate', 'network', 'firstName', 'dateOfBirth'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'LN3 DOB': {
    memberFocused: ['serviceDate', 'network', 'lastName', 'dateOfBirth'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'INSID LN3 FN3': {
    memberFocused: [
      'serviceDate',
      'network',
      'insuredId',
      'lastName',
      'firstName',
    ],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'INSID LN3': {
    memberFocused: ['serviceDate', 'network', 'insuredId', 'lastName'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'INSID DOB G': {
    memberFocused: [
      'serviceDate',
      'network',
      'insuredId',
      'dateOfBirth',
      'gender',
    ],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'INSID G': {
    memberFocused: ['serviceDate', 'network', 'insuredId', 'gender'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'INSID FN3 G': {
    memberFocused: [
      'serviceDate',
      'network',
      'insuredId',
      'firstName',
      'gender',
    ],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  'INSID FN3 DOB': {
    memberFocused: [
      'serviceDate',
      'network',
      'insuredId',
      'firstName',
      'dateOfBirth',
    ],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },
  INSID: {
    memberFocused: ['serviceDate', 'network', 'insuredId'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ENROLL_EG_HIGHLIGHTED,
  },

  // ── GROUP category (HALT_GROUP reason code) ───────────────────────────────
  // Member Search → Highlighted  |  Employer Group → Focused + Highlighted

  GROUPNAME: {
    memberFocused: [],
    memberHighlighted: GROUP_MEMBER_HIGHLIGHTED,
    employerFocused: ['network', 'groupNameAlias'],
    employerHighlighted: [],
  },
  POLICY: {
    memberFocused: [],
    memberHighlighted: GROUP_MEMBER_HIGHLIGHTED,
    employerFocused: ['network', 'policyAlias'],
    employerHighlighted: [],
  },
  PAYERNAME: {
    memberFocused: [],
    memberHighlighted: GROUP_MEMBER_HIGHLIGHTED,
    employerFocused: ['network', 'parentCodeDescAlias'],
    employerHighlighted: [],
  },
  PARTIAL_POLICY_OR_REVERSED: {
    memberFocused: [],
    memberHighlighted: GROUP_MEMBER_HIGHLIGHTED,
    employerFocused: ['network', 'policyAlias'],
    employerHighlighted: [],
  },
  SECONDARY_COVERAGE: {
    memberFocused: [],
    memberHighlighted: GROUP_MEMBER_HIGHLIGHTED,
    employerFocused: ['network', 'policyAlias'],
    employerHighlighted: [],
  },
  ENR_MATCH_REQUIRED: {
    memberFocused: [],
    memberHighlighted: GROUP_MEMBER_HIGHLIGHTED,
    employerFocused: ['network', 'clientCode'],
    employerHighlighted: [],
  },
  POLICY_ON_PEND_LIST: {
    memberFocused: [],
    memberHighlighted: GROUP_MEMBER_HIGHLIGHTED,
    employerFocused: ['network', 'policyAlias'],
    employerHighlighted: [],
  },
  // Special: Member Search is F+H on ServiceDate+Network; EG is Highlighted on Network+Policy
  DISCREPANCY_BETWN_PARENT_CODES: {
    memberFocused: ['serviceDate', 'network'],
    memberHighlighted: [],
    employerFocused: [],
    employerHighlighted: ['network', 'policyAlias'],
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the field highlight config for a given scenario value.
 * Returns null when scenario is empty or unrecognised —
 * callers should treat null as "no specific highlighting required".
 */
export function getScenarioConfig(
  scenario: string
): ScenarioFieldConfig | null {
  if (!scenario) return null;
  return SCENARIO_CONFIG[scenario] ?? null;
}
