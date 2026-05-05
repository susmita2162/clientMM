// src/types/module-federation.d.ts
// Type declarations for Module Federation remote modules.
// MUST stay in sync with actual widget source files.
//
// Last verified against:
//   memberSearchApp        — MemberSearch.tsx, MemberSearchWidget.tsx
//   employerGroupSearchApp — EmployerGroupSearchForm.tsx, EmployerGroupSearchWidget.tsx
//
// ── NO top-level imports in this file ────────────────────────────────────────
// A top-level import converts a .d.ts from an AMBIENT declaration file into a
// MODULE file. declare module blocks in a module file are not applied globally —
// TypeScript never resolves 'memberSearchApp/MemberSearchWidget', producing
// ts(2307) in every consumer (vite.config has dts:false, so no auto-generated
// types from the federation plugin either).
//
// MemberSearchField and EmployerGroupField are sourced from scenarioFieldConfig.ts
// via inline import() types — no duplication, no top-level import.
//
// ── Registration ──────────────────────────────────────────────────────────────
// Add to src/vite-env.d.ts so TypeScript always picks up this file:
//   /// <reference path="./types/module-federation.d.ts" />

declare module 'memberSearchApp/MemberSearchWidget' {
  import { ComponentType } from 'react';

  // ── Re-export field type from scenarioFieldConfig (no duplication) ─────────
  // Consumers can: import type { MemberSearchField } from 'memberSearchApp/MemberSearchWidget'
  export type MemberSearchField =
    import('../utils/scenarioFieldConfig').MemberSearchField;

  // ── Data types ─────────────────────────────────────────────────────────────

  export type MemberSearchForm = {
    loadId?: string;
    senderId?: string;
    subscriberId?: string;
    memberId?: string;
    lastName?: string;
    firstName?: string;
    dateOfBirth?: string; // matches member.ts (NOT dob)
    ssn?: string;
    gender?: string;
    relationship?: string; // matches member.ts (NOT relationshipCode)
    state?: string;
    policy?: string;
    effectiveDate?: string;
    postProcessDate?: string;
    groupName?: string; // matches member.ts (NOT employerGroupName)
    ccode?: string;
    network?: string;
    insuredId?: string;
    serviceDate?: string;
  };

  export type MemberRecord = {
    id: string;
    memberId: string;
    firstName: string;
    lastName: string;
    dtOfBirth?: string; // matches member.ts (NOT dob)
    ssn?: string;
    ssnMasked?: string;
    senderId?: string;
    subscriberId?: string;
    loadId?: string;
    gender?: string;
    relationship?: string; // matches member.ts (NOT relationshipCode)
    state?: string;
    policy?: string;
    effectiveDate?: string;
    postProcessDate?: string;
    groupName?: string; // matches member.ts (NOT employerGroupName)
    /** Optional — guard in MemberSearchPanel.extractCcode handles absent values. */
    ccode?: string;
    network?: string;
    middleName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    phone?: string;
    email?: string;
    terminationDate?: string;
    ppoId?: string;
    comments?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
  };

  /** 'standalone': full field set + Advanced Search. 'embedded': reduced field set. */
  export type MemberSearchMode = 'standalone' | 'embedded';

  // ── Widget props — exact match to MemberSearchWidgetProps in widget source ─
  export interface MemberSearchWidgetProps {
    onMemberSelected?: (member: MemberRecord) => void;
    autoSearch?: boolean;
    mode?: MemberSearchMode;
    /** Fields to highlight yellow. Source: scenarioConfig.memberFields */
    fields?: MemberSearchField[];
    /** Pre-populated claim values for form seeding and auto-search. */
    initialCriteria?: Partial<MemberSearchForm>;
  }

  const MemberSearchWidget: ComponentType<MemberSearchWidgetProps>;
  export default MemberSearchWidget;
}

declare module 'employerGroupSearchApp/EmployerGroupSearchWidget' {
  import { ComponentType } from 'react';

  // ── Re-export field type from scenarioFieldConfig (no duplication) ─────────
  export type EmployerGroupField =
    import('../utils/scenarioFieldConfig').EmployerGroupField;

  // ── Data types ─────────────────────────────────────────────────────────────

  export type EmployerGroupSearchForm = {
    ccode?: string;
    clientName?: string;
    parentCode?: string;
    parentCodeDescription?: string;
    active?: boolean;
    availability?: boolean;
    network?: string;
    clientCodeEffectiveDate?: string;
    employerGroupEffectiveDate?: string;
    groupNameAlias?: string;
    policyNumAlias?: string;
    policyExactMatch?: boolean;
    matchRequired?: string;
  };

  export type ClientRecord = {
    id: number;
    parentCode?: string;
    parentCodeDescription?: string;
    /** Required — ClientRecord.ccode drives live Client Code display in the host. */
    ccode: string;
    clientName: string;
    matchRequired?: string;
    effectiveDate?: string;
    terminationDate?: string;
    network?: string;
  };

  export type EmployerGroupRecord = {
    id: number;
    ccode: string;
    empGroupName: string;
    employerGroupAliases: string[];
    empgrpNote?: string;
    empGrpEffectiveDate?: string;
    empGrpTerminationDate?: string | null;
    pend?: string;
    empGrpRunOut?: number;
    empGrpPostProcessing?: string;
    cdmEmpgrpId?: number;
  };

  export type EmployerGroupPolicyRecord = {
    ccode: string;
    empGroupName: string;
    policy: string;
    policyCode?: number;
    divisionLocation?: string;
    policyEffectiveDate?: string;
    policyTerminationDate?: string | null;
    employerGroupPolicyAliases: string[];
    ppoId?: string;
  };

  // ── Widget props — exact match to EmployerGroupSearchWidgetProps in widget source ─
  export interface EmployerGroupSearchWidgetProps {
    onClientCodeSelected?: (record: ClientRecord) => void;
    autoSearch?: boolean;
    /** Fields to highlight yellow. Source: scenarioConfig.employerFields */
    fields?: EmployerGroupField[];
    /** Pre-populated claim values for form seeding and auto-search. */
    initialCriteria?: Partial<EmployerGroupSearchForm>;
  }

  const EmployerGroupSearchWidget: ComponentType<EmployerGroupSearchWidgetProps>;
  export default EmployerGroupSearchWidget;
}
