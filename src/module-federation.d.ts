// Type declarations for Module Federation remote modules
// UPDATED: Using actual types from remote applications

declare module 'memberSearchApp/MemberSearchWidget' {
  import { ComponentType } from 'react';

  // ============================================================================
  // MEMBER SEARCH TYPES - Matching actual member.ts from Member Search app
  // ============================================================================

  export type MemberSearchForm = {
    loadId?: string;
    senderId?: string;
    subscriberId?: string;
    memberId?: string;
    lastName?: string;
    firstName?: string;
    dob?: string; // YYYY-MM-DD
    ssn?: string;
    gender?: string;
    relationshipCode?: string;
    state?: string;
    policy?: string;
    effectiveDate?: string; // YYYY-MM-DD
    postProcessDate?: string; // YYYY-MM-DD
    employerGroupName?: string;
    ccode?: string;
    network?: string;
  };

  export type MemberRecord = {
    id: string;
    memberId: string;
    firstName: string;
    lastName: string;
    dob?: string;
    ssn?: string;
    ssnMasked?: string;
    senderId?: string;
    subscriberId?: string;
    loadId?: string;
    gender?: string;
    relationshipCode?: string;
    state?: string;
    policy?: string;
    effectiveDate?: string;
    postProcessDate?: string;
    employerGroupName?: string;
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

  /**
   * Props for MemberSearchWidget component
   * IMPORTANT: Widget expects these specific field names
   */
  export interface MemberSearchWidgetProps {
    /**
     * Network
     */
    network?: string;

    /**
     * Client Code (CCode)
     */
    ccode?: string;

    /**
     * Callback when a member is selected
     */
    onMemberSelected?: (member: MemberRecord) => void;

    /**
     * Auto-search on mount
     */
    autoSearch?: boolean;

    /**
     * Render mode.
     * 'standalone' (default) — full field set with Advanced Search toggle.
     * 'embedded'             — reduced field set when hosted inside Claims Management.
     */
    mode?: 'standalone' | 'embedded';
  }

  const MemberSearchWidget: ComponentType<MemberSearchWidgetProps>;
  export default MemberSearchWidget;
}

declare module 'employerGroupSearchApp/EmployerGroupSearchWidget' {
  import { ComponentType } from 'react';

  // ============================================================================
  // EMPLOYER GROUP TYPES - Matching actual employerGroup.ts
  // ============================================================================

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

  /**
   * Props for EmployerGroupSearchWidget component
   * IMPORTANT: Widget expects these specific field names
   */
  export interface EmployerGroupSearchWidgetProps {
    /**
     * Client Code (CCode) - PRIMARY search field
     */
    ccode?: string;

    /**
     * Network
     */
    network?: string;

    /**
     * Callback when an employer group is selected
     */
    onEmployerGroupSelected?: (group: EmployerGroupRecord) => void;

    /**
     * Callback when a client code is selected
     */
    onClientCodeSelected?: (ccode: ClientRecord) => void;

    /**
     * Auto-search on mount
     */
    autoSearch?: boolean;
  }

  const EmployerGroupSearchWidget: ComponentType<EmployerGroupSearchWidgetProps>;
  export default EmployerGroupSearchWidget;
}
