// src/utils/scenarioFieldConfig.ts
//
// Rule Code → MFE Field Configuration
//
// Source: Halt_Claims_Scenarios.xlsx (Search Criteria Prepopulate matrix)
// MATCH_TYPE is always HALT — this config only applies to halted claims.
//
// ── Design ────────────────────────────────────────────────────────────────────
//
// Keyed on RULE_CODE (additionalInfo.info["ruleCode"]) — the stable numeric
// identifier from the API. Previously keyed on SCENARIO label, which is
// human-readable and not guaranteed stable across backend changes.
//
// focusedMfe     — which MFE tab opens first when navigating to
//                  ClientManualMatchDashboard:
//                    CATEGORY = "ENROLLMENT" → 'member'   (Member Search tab)
//                    CATEGORY = "GROUP"      → 'employerGroup' (EG Search tab)
//                  The focused tab's title also receives the scenario suffix
//                  (e.g. "Member Search - INSID LN3") — scenario is kept on
//                  HaltedClaim for display; ruleCode drives this config lookup.
//
// memberFields   — fields passed from host → Member Search MFE.
//                  MFE pre-populates, highlights yellow, and auto-searches.
//
// employerFields — same for Employer Group Search MFE.
//                  Scenario-level names mapped to form keys in Dashboard via
//                  EG_FIELD_TO_FORM_KEY:
//                    policyAlias         → policyNumAlias
//                    groupNameAlias      → groupNameAlias
//                    parentCodeDescAlias → parentCodeDescription
//                    clientCode          → ccode
//                    network             → network

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
 * Mapped to actual form keys via EG_FIELD_TO_FORM_KEY in Dashboard.
 */
export type EmployerGroupField =
  | 'network'
  | 'policyAlias'
  | 'groupNameAlias'
  | 'parentCodeDescAlias'
  | 'clientCode';

// ── Config shape ──────────────────────────────────────────────────────────────

export interface ScenarioFieldConfig {
  /** Which MFE tab opens first. 'member' = index 0, 'employerGroup' = index 1. */
  focusedMfe: 'member' | 'employerGroup';
  /** Member Search fields to pre-populate, highlight, and auto-search. */
  memberFields: MemberSearchField[];
  /** Employer Group Search fields to pre-populate, highlight, and auto-search. */
  employerFields: EmployerGroupField[];
}

// ── Shared field lists ────────────────────────────────────────────────────────

/** All ENROLLMENT rules: EG always shows Policy#/Alias + Network */
const ENROLL_EG_FIELDS: EmployerGroupField[] = ['policyAlias', 'network'];

/** All GROUP rules: MS always shows Service Date + Network */
const GROUP_MS_FIELDS: MemberSearchField[] = ['serviceDate', 'network'];

// ── Matrix — keyed by RULE_CODE (additionalInfo.info["ruleCode"]) ─────────────
//
// Source: Halt_Claims_Scenarios.xlsx
//   ENROLLMENT rules → focusedMfe: 'member'       (rows 1–11, 25)
//   GROUP rules      → focusedMfe: 'employerGroup' (rows 15–19, 23–24)

const RULE_CODE_CONFIG: Record<string, ScenarioFieldConfig> = {
  // ── ENROLLMENT (HALT_ENROLL) — Member Search focused ─────────────────────
  // Rule 1301: NEWBORN
  '1301': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network'],
    employerFields: ENROLL_EG_FIELDS,
  },
  // Rule 1401: LN FN
  '1401': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'lastName', 'firstName'],
    employerFields: ENROLL_EG_FIELDS,
  },
  // Rule 1402: FN3 DOB
  '1402': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'firstName', 'dateOfBirth'],
    employerFields: ENROLL_EG_FIELDS,
  },
  // Rule 1403: LN3 DOB
  '1403': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'lastName', 'dateOfBirth'],
    employerFields: ENROLL_EG_FIELDS,
  },
  // Rule 1501: INSID LN3 FN3
  '1501': {
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
  // Rule 1502: INSID LN3
  '1502': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'insuredId', 'lastName'],
    employerFields: ENROLL_EG_FIELDS,
  },
  // Rule 1503: INSID DOB G
  '1503': {
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
  // Rule 1504: INSID G
  '1504': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'insuredId', 'gender'],
    employerFields: ENROLL_EG_FIELDS,
  },
  // Rule 1505: INSID FN3 G
  '1505': {
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
  // Rule 1506: INSID FN3 DOB
  '1506': {
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
  // Rule 1507: INSID
  '1507': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network', 'insuredId'],
    employerFields: ENROLL_EG_FIELDS,
  },

  // ── GROUP (HALT_GROUP) — Employer Group Search focused ───────────────────
  // Rule 3301: GROUPNAME
  '3301': {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'groupNameAlias'],
  },
  // Rule 3401: POLICY
  '3401': {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },
  // Rule 3501: PAYERNAME
  '3501': {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'parentCodeDescAlias'],
  },
  // Rule 3601: PARTIAL_POLICY_OR_REVERSED
  '3601': {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },
  // Rule 3701: SECONDARY_COVERAGE
  '3701': {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },

  // ── Special Halt Processing Rules ─────────────────────────────────────────
  // Rule 7001: ENR_MATCH_REQUIRED — GROUP, EG focused, Client Code highlighted
  '7001': {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'clientCode'],
  },
  // Rule 7002: POLICY_ON_PEND_LIST — GROUP, EG focused
  '7002': {
    focusedMfe: 'employerGroup',
    memberFields: GROUP_MS_FIELDS,
    employerFields: ['network', 'policyAlias'],
  },
  // Rule 7003: DISCREPANCY_BETWN_PARENT_CODES — ENROLLMENT, Member Search focused
  '7003': {
    focusedMfe: 'member',
    memberFields: ['serviceDate', 'network'],
    employerFields: ENROLL_EG_FIELDS,
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the field config for a given rule code.
 * Returns null when ruleCode is empty or not in the matrix.
 * Callers handle null as "no config — no highlighting, default tab (Member Search)".
 *
 * @param ruleCode - from HaltedClaim.ruleCode (additionalInfo.info["ruleCode"])
 */
export function getScenarioConfig(
  ruleCode: string
): ScenarioFieldConfig | null {
  if (!ruleCode) return null;
  return RULE_CODE_CONFIG[ruleCode] ?? null;
}
