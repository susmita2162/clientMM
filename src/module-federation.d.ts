// src/types/module-federation.d.ts
// Type declarations for Module Federation remote modules.
// MUST stay in sync with actual widget source files.
//
// Last verified against:
//   employerGroupSearchApp — EmployerGroupSearchForm.tsx, EmployerGroupSearchWidget.tsx
//
// NOTE: memberSearchApp is no longer a Module Federation remote as of the
// migration to the npm package `ucp-member-search-ui`. Its types now come
// from that package's own shipped dist/index.d.ts — do not re-add an
// ambient declaration for it here.
//
// ── NO top-level imports in this file ────────────────────────────────────────
// A top-level import converts a .d.ts from an AMBIENT declaration file into a
// MODULE file. declare module blocks in a module file are not applied globally —
// TypeScript never resolves 'employerGroupSearchApp/EmployerGroupSearchWidget',
// producing ts(2307) in every consumer (vite.config has dts:false, so no
// auto-generated types from the federation plugin either).
//
// EmployerGroupField is sourced from scenarioFieldConfig.ts via inline
// import() types — no duplication, no top-level import.
//
// ── Registration ──────────────────────────────────────────────────────────────
// Add to src/vite-env.d.ts so TypeScript always picks up this file:
//   /// <reference path="./types/module-federation.d.ts" />

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
