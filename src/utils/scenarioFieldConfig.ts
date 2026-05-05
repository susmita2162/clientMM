// src/utils/scenarioFieldConfig.ts
//
// Scenario → MFE Field Configuration
//
// Source: Halt_Claims_Scenarios.xlsx (Search Criteria Prepopulate matrix)
// MATCH_TYPE is always HALT — this config only applies to halted claims.
//
// ── Design ────────────────────────────────────────────────────────────────────
//
// focusedMfe     — which MFE tab the user lands on when navigating to
//                  ClientManualMatchDashboard. That tab's title also receives
//                  the scenario suffix: "Member Search - FN3 DOB".
//
// memberFields   — fields passed from host to Member Search MFE.
//                  The MFE pre-populates these from claim values, highlights
//                  them yellow, and auto-searches with them on mount.
//
// employerFields — same for Employer Group Search MFE.
//
// Both MFEs always pre-populate + highlight + auto-search with their fields.
// The only difference between focused and non-focused is which tab opens first.

// ── Field identifier unions ───────────────────────────────────────────────────

/** Field keys recognised by the Member Search MFE (map 1-to-1 to MemberSearchForm keys) */
export type MemberSearchField =
  | 'serviceDate'
  | 'network'
  | 'insuredId'
  | 'lastName'
  | 'firstName'
  | 'dateOfBirth'
  | 'gender';

/**
 * Field keys recognised by the Employer Group Search MFE.
 * These are scenario-level names — mapped to form keys via EG_FIELD_TO_FORM_KEY
 * in EmployerGroupSearchForm.tsx and EG_FIELD_TO_FORM_KEY in Dashboard.
 *   policyAlias        → policyNumAlias
 *   parentCodeDescAlias→ parentCodeDescription
 *   clientCode         → ccode
 *   network            → network
 *   groupNameAlias     → groupNameAlias
 */
export type EmployerGroupField =
  | 'network'
  | 'policyAlias'
  | 'groupNameAlias'
  | 'parentCodeDescAlias'
  | 'clientCode';

// ── Config shape ──────────────────────────────────────────────────────────────

export interface ScenarioFieldConfig {
  /**
   * Which MFE tab opens first and receives the scenario title suffix.
   * 'member' → Member Search tab (index 0)
   * 'employerGroup' → Employer Group Search tab (index 1)
   */
  focusedMfe: 'member' | 'employerGroup';
  /**
   * Member Search fields to pass from host → MFE.
   * The MFE pre-populates these from claim values, highlights them yellow,
   * and auto-searches with them on mount.
   */
  memberFields: MemberSearchField[];
  /**
   * Employer Group Search fields to pass from host → MFE.
   * Same behaviour as memberFields.
   */
  employerFields: EmployerGroupField[];
}

// ── Shared patterns ───────────────────────────────────────────────────────────

/** Enrollment scenarios: MS is focused; EG always shows Policy#/Alias + Network */
const ENROLL_EG_FIELDS: EmployerGroupField[] = ['policyAlias', 'network'];

/** Group scenarios: EG is focused; MS always shows ServiceDate + Network */
const GROUP_MS_FIELDS: MemberSearchField[] = ['serviceDate', 'network'];

// ── Matrix — keyed by NextHaltedClaimResponse.scenario ───────────────────────

const SCENARIO_CONFIG: Record<string, ScenarioFieldConfig> = {
  // ── ENROLLMENT (HALT_ENROLL) — Member Search focused ─────────────────────

  NEWBORN: {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network'],
    employerFields: ENROLL_EG_FIELDS,
  },
  'LN FN': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'lastName', 'firstName'],
    employerFields: ENROLL_EG_FIELDS,
  },
  'FN3 DOB': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'firstName', 'dateOfBirth'],
    employerFields: ENROLL_EG_FIELDS,
  },
  'LN3 DOB': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'lastName', 'dateOfBirth'],
    employerFields: ENROLL_EG_FIELDS,
  },
  'INSID LN3 FN3': {
    focusedMfe: 'member',
    memberFields: [
      'serviceDate',
      'network',
      'insuredId',
      'lastName',
      'firstName',
    ],
    employerFields: ENROLL_EG_FIELDS,
  },
  'INSID LN3': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'insuredId', 'lastName'],
    employerFields: ENROLL_EG_FIELDS,
  },
  'INSID DOB G': {
    focusedMfe: 'member',
    memberFields: [
      'serviceDate',
      'network',
      'insuredId',
      'dateOfBirth',
      'gender',
    ],
    employerFields: ENROLL_EG_FIELDS,
  },
  'INSID G': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'insuredId', 'gender'],
    employerFields: ENROLL_EG_FIELDS,
  },
  'INSID FN3 G': {
    focusedMfe: 'member',
    memberFields: [
      'serviceDate',
      'network',
      'insuredId',
      'firstName',
      'gender',
    ],
    employerFields: ENROLL_EG_FIELDS,
  },
  'INSID FN3 DOB': {
    focusedMfe: 'member',
    memberFields: [
      'serviceDate',
      'network',
      'insuredId',
      'firstName',
      'dateOfBirth',
    ],
    employerFields: ENROLL_EG_FIELDS,
  },
  INSID: {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'insuredId'],
    employerFields: ENROLL_EG_FIELDS,
  },

  // ── GROUP (HALT_GROUP) — Employer Group Search focused ───────────────────

  GROUPNAME: {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'groupNameAlias'],
  },
  POLICY: {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },
  PAYERNAME: {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'parentCodeDescAlias'],
  },
  PARTIAL_POLICY_OR_REVERSED: {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },
  SECONDARY_COVERAGE: {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },
  ENR_MATCH_REQUIRED: {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'clientCode'],
  },
  POLICY_ON_PEND_LIST: {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },

  // ── Special — both MFEs have fields; Member Search is focused ────────────
  DISCREPANCY_BETWN_PARENT_CODES: {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network'],
    employerFields: ['network', 'policyAlias'],
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the scenario config for a given scenario value.
 * Returns null when scenario is empty or unrecognised.
 * Callers handle null as "no scenario — no highlighting, default tab".
 */
export function getScenarioConfig(
  scenario: string
): ScenarioFieldConfig | null {
  if (!scenario) return null;
  return SCENARIO_CONFIG[scenario] ?? null;
}
