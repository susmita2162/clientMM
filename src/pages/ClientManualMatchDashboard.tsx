// src/pages/ClientManualMatchDashboard.tsx
//
// CHANGES (this iteration):
//
//   1. Post-updateCCode success flow — corrected:
//      After updateCCode returns statusCode 'C', call getNextHaltedClaim
//      (POST /nextHalted) to load the next claim. updateCCode does NOT call
//      pendClaim — pend is a separate user-initiated action.
//      All actions (updateCCode, pendClaim, denyClaim, resetClaim) now use
//      the same loadNextHaltedClaim path via queueContextRef.
//
//   2. CcodeNotFound inline banner:
//      When updateCCode returns statusCode 'A' (invalid: 'ccodeNotFound'),
//      ClaimInformationPanel calls onCcodeNotFound(message). The dashboard
//      shows CcodeNotFoundBanner inline above the MFE panels.
//      Retry → clears the banner; Return to Dashboard → /manual-review.
//
//   3. scenarioFieldConfig lookup: keyed on ruleCode (stable), not scenario label.
//
// Previous changes (retained):
//   - adaptHaltedClaimResponse used directly (alias removed).
//   - serviceDate MM-DD-YYYY → YYYY-MM-DD conversion via toIsoDate().

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ClaimInformationPanel from '../components/ClaimInformationPanel';
import MemberSearchPanel from '../components/MemberSearchPanel';
import EmployerGroupSearchPanel from '../components/EmployerGroupSearchPanel';
import { CcodeNotFoundBanner } from '../components/UpdateCcodeDialogs';
import { claimsApi } from '../services/claimsApi';
import { getScenarioConfig } from '../utils/scenarioFieldConfig';
import { adaptHaltedClaimResponse } from '../utils/claimAdapters';
import type { HaltedClaim, QueueContext } from '../types/claims';
import type { MemberRecord, MemberSearchForm } from 'ucp-member-search-ui';
import type { EmployerGroupSearchForm } from 'ucp-group-search-ui';

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCK_EXPIRATION_MINUTES = 15;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientManualMatchDashboardProps {
  /**
   * Claim data, supplied by the host. This component never imports
   * react-router or any other router, so it does not read location.state —
   * each host is responsible for getting claim data to it (the standalone
   * app's route wrapper reads react-router state; Chassis's route fetches
   * by claimNumber URL param).
   */
  claim?: HaltedClaim;
  /**
   * Queue filter context, supplied by the host. Present only when the user
   * arrived via the Claims Table (queue-driven flow) — absent when they
   * arrived via direct claim search. Determines whether completing an
   * action advances to the next queued claim or returns to the dashboard.
   */
  queueContext?: QueueContext;
  /**
   * "Go back to Manual Review" callback. Every internal navigation-back
   * action in this component calls this — there is no built-in fallback,
   * since this component has no router of its own.
   */
  onNavigateBack: () => void;
  userName?: string;
  /**
   * Member Search / Employer Group Search runtime config, supplied by the
   * host the same way claimsApi's config is (see configureClaimsService).
   * These MFE packages ship with build-time env-var defaults that only
   * apply to their own standalone dev builds — an embedding host MUST
   * override them at runtime via configureMemberService /
   * configureGroupSearchService, or they silently fall back to those
   * baked-in defaults (commonly localhost) in production.
   */
  apiMode: 'mock' | 'live';
  liveBaseUrl: string;
  mockBaseUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts MM-DD-YYYY → YYYY-MM-DD for HTML <input type="date"> display.
 * Returns the input unchanged for any other format.
 */
function toIsoDate(value: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : value;
}

// ── AlwaysMountedPanel ────────────────────────────────────────────────────────
//
// Both MFE panels must stay mounted permanently (visibility toggled via CSS
// display, not mount/unmount) — remounting on every tab switch replays each
// panel's config + auto-search effects, multiplying the config-race window
// that produces localhost/stale-config requests and inconsistent auto-search.

interface AlwaysMountedPanelProps {
  children: React.ReactNode;
  visible: boolean;
}

const AlwaysMountedPanel = ({ children, visible }: AlwaysMountedPanelProps) => (
  <Box
    sx={{
      display: visible ? 'flex' : 'none',
      height: '100%',
      width: '100%',
      flexDirection: 'column',
      overflow: 'hidden',
    }}
  >
    {children}
  </Box>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientManualMatchDashboard({
  claim: incomingClaim,
  queueContext: queueContextProp,
  onNavigateBack,
  userName = 'user',
  apiMode,
  liveBaseUrl,
  mockBaseUrl,
}: ClientManualMatchDashboardProps) {
  const [claim, setClaim] = useState<HaltedClaim | null>(incomingClaim ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueEmpty, setQueueEmpty] = useState(false);

  // CcodeNotFound banner — shown inline when updateCCode returns statusCode 'A'.
  // Cleared on successful action, retry, or navigation.
  const [ccodeNotFoundMessage, setCcodeNotFoundMessage] = useState<
    string | null
  >(null);

  const [activeTab, setActiveTab] = useState(() => {
    const cfg = getScenarioConfig(incomingClaim?.ruleCode ?? '');
    return cfg?.focusedMfe === 'employerGroup' ? 1 : 0;
  });

  // ── MFE selection state ───────────────────────────────────────────────────
  const [selectedCcode, setSelectedCcode] = useState('');
  const [selectedEligMemberId, setSelectedEligMemberId] = useState<number>(0);
  const [selectedMemberServiceDate, setSelectedMemberServiceDate] =
    useState<string>('');
  const [selectedMatchType, setSelectedMatchType] = useState('');

  const queueContextRef = useRef<QueueContext | null>(null);
  const hasInitialized = useRef(false);

  // ── Reset MFE selection state ─────────────────────────────────────────────

  const resetMfeSelection = useCallback(() => {
    setSelectedCcode('');
    setSelectedEligMemberId(0);
    setSelectedMemberServiceDate('');
    setSelectedMatchType('');
  }, []);

  // ── Load next halted claim from queue ────────────────────────────────────
  //
  // Called after every completed action: updateCCode (statusCode 'C'),
  // pendClaim, pendNotes, denyClaim, resetClaim.
  // All actions use the same POST /nextHalted path.

  const loadNextHaltedClaim = useCallback(
    async (ctx: QueueContext) => {
      setLoading(true);
      setError(null);
      setQueueEmpty(false);
      setCcodeNotFoundMessage(null);
      resetMfeSelection();
      try {
        const response = await claimsApi.getNextHaltedClaim({
          claimType: ctx.claimType,
          pended: ctx.pended,
          network: ctx.network,
          lockedByUser: 'system',
          lockExpiration: LOCK_EXPIRATION_MINUTES,
        });

        // TODO: statusCode/description are not yet on the shared
        // HaltedClaimApiResponse type — `as any` is a stand-in until the
        // package's types/claims.ts is updated to include this locked-claim
        // response shape. Not fabricating a type here without seeing the
        // real API contract.
        if (response && (response as any).status?.statusCode === 'A') {
          setError(
            (response as any).status?.description ??
              'Claim is already locked by another user'
          );
          return;
        }

        if (response) {
          const nextClaim = adaptHaltedClaimResponse(response);
          setClaim(nextClaim);
          const nextCfg = getScenarioConfig(nextClaim.ruleCode ?? '');
          setActiveTab(nextCfg?.focusedMfe === 'employerGroup' ? 1 : 0);
        } else {
          setQueueEmpty(true);
        }
      } catch {
        setError('Failed to load next claim. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [resetMfeSelection, userName]
  );

  const handleNavigateBack = useCallback(() => {
    onNavigateBack?.();
  }, [onNavigateBack]);

  // ── Initialisation ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (incomingClaim) {
      setClaim(incomingClaim);
      if (queueContextProp) {
        queueContextRef.current = queueContextProp;
      }
      setLoading(false);
      return;
    }

    setError(
      'No claim data available. Please search for a claim or select one from the dashboard.'
    );
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Action handler ────────────────────────────────────────────────────────
  //
  // All completed actions (updateCCode, pendClaim, pendNotes, denyClaim,
  // resetClaim) call getNextHaltedClaim to load the next claim from the queue.
  // If no queue context exists (search-navigated entry), go back to dashboard.

  const handleClaimAction = useCallback(
    (_action: 'updateCCode' | 'pendClaim' | 'pendNotes' | 'denyClaim') => {
      if (!claim) return;
      setCcodeNotFoundMessage(null);

      if (queueContextRef.current) {
        void loadNextHaltedClaim(queueContextRef.current);
      } else {
        onNavigateBack();
      }
    },
    [loadNextHaltedClaim, onNavigateBack]
  );

  // ── CcodeNotFound handler ─────────────────────────────────────────────────
  //
  // Called by ClaimInformationPanel when updateCCode returns statusCode 'A'.
  // Shows the inline CcodeNotFoundBanner — no queue advance, no override.

  const handleCcodeNotFound = useCallback((message: string) => {
    setCcodeNotFoundMessage(message);
  }, []);

  // ── Member selection handler ───────────────────────────────────────────────

  const handleMemberSelected = useCallback((member: MemberRecord) => {
    setSelectedCcode(member.ccode ?? '');
    setSelectedEligMemberId(Number(member.id) || 0);
    setSelectedMemberServiceDate(member.effectiveDate ?? '');
  }, []);

  // ── Scenario config + MFE criteria ────────────────────────────────────────

  const scenarioConfig = claim ? getScenarioConfig(claim.ruleCode ?? '') : null;

  const memberAllValues: Record<string, string | undefined> = {
    network: claim?.network || undefined,
    insuredId: claim?.insuredId || undefined,
    serviceDate: claim?.serviceDate || undefined,
    dateOfBirth: claim?.dateOfBirth || undefined,
    gender: claim?.gender || undefined,
    firstName: claim?.firstName || undefined,
    lastName: claim?.lastName || undefined,
  };

  const EG_FIELD_TO_FORM_KEY: Record<string, string> = {
    network: 'network',
    policyAlias: 'policyNumAlias',
    groupNameAlias: 'groupNameAlias',
    parentCodeDescAlias: 'parentCodeDescription',
    clientCode: 'ccode',
  };

  const egAllValues: Record<string, string | undefined> = {
    network: claim?.network || undefined,
    ccode: claim?.ccode || undefined,
    policyNumAlias: claim?.policy || undefined,
    groupNameAlias: claim?.group || undefined,
    parentCodeDescription: claim?.payer || undefined,
  };

  const memberInitialCriteria = useMemo(():
    | Partial<MemberSearchForm>
    | undefined => {
    const fields = scenarioConfig?.memberFields ?? [];
    if (!fields.length) return undefined;
    const entries = fields
      .map((f): [string, string | undefined] => [f, memberAllValues[f]])
      .filter((entry): entry is [string, string] => entry[1] !== undefined);
    const criteria = Object.fromEntries(entries) as Partial<MemberSearchForm>;

    // serviceDate from nextHalted arrives as MM-DD-YYYY; <input type="date">
    // requires YYYY-MM-DD — convert so the field populates correctly.
    // effectiveDate is seeded with the same ISO value so the auto-search API
    // call includes it. When the user edits serviceDate and clicks Search,
    // buildSearchCriteria in memberService.ts overwrites effectiveDate with
    // the updated serviceDate value at call time.
    if (criteria.serviceDate) {
      const isoDate = toIsoDate(criteria.serviceDate);
      criteria.serviceDate = isoDate;
      criteria.effectiveDate = isoDate;
    }

    return criteria;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim, scenarioConfig]);

  const egInitialCriteria = useMemo(():
    | Partial<EmployerGroupSearchForm>
    | undefined => {
    const fields = scenarioConfig?.employerFields ?? [];
    if (!fields.length) return undefined;
    const entries = fields
      .map((f): [string, string | undefined] => [
        EG_FIELD_TO_FORM_KEY[f],
        egAllValues[EG_FIELD_TO_FORM_KEY[f]],
      ])
      .filter((entry): entry is [string, string] => entry[1] !== undefined);
    return Object.fromEntries(entries) as Partial<EmployerGroupSearchForm>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim, scenarioConfig]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Box sx={{ mt: 2, color: 'text.secondary' }}>
            Loading claim information...
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Queue empty ───────────────────────────────────────────────────────────

  if (queueEmpty) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity='info' sx={{ maxWidth: 480, width: '100%' }}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }} gutterBottom>
            Queue Complete
          </Typography>
          <Typography variant='body2'>
            There are no more halted claims available in this queue. All claims
            have been processed or are locked by another user.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (error || !claim) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error' sx={{ mb: 2 }}>
          {error ?? 'Claim not found.'}
        </Alert>
        <Button variant='outlined' onClick={onNavigateBack}>
          Return to Manual Review Dashboard
        </Button>
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: { xs: 0.5, sm: 1 },
        overflow: 'hidden',
      }}
    >
      {/* CCode Not Found inline banner — shown when statusCode 'A' (no override) */}
      {ccodeNotFoundMessage && (
        <Box sx={{ flexShrink: 0, px: { xs: 0.5, sm: 0 } }}>
          <CcodeNotFoundBanner
            message={ccodeNotFoundMessage}
            onRetry={() => {
              // Clear the banner — ClaimInformationPanel re-opens UpdateCcodeDialog
              // via its own internal state when the user clicks Update CCode again.
              setCcodeNotFoundMessage(null);
            }}
            onReturnToDashboard={handleNavigateBack}
          />
        </Box>
      )}

      <Box sx={{ flexShrink: 0 }}>
        <ClaimInformationPanel
          claim={claim}
          onAction={handleClaimAction}
          onCcodeNotFound={handleCcodeNotFound}
          selectedCcode={selectedCcode || undefined}
          selectedEligMemberId={selectedEligMemberId}
          selectedMemberServiceDate={selectedMemberServiceDate}
          selectedMatchType={selectedMatchType || undefined}
          onNavigateBack={handleNavigateBack}
          userName={userName}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v: number) => setActiveTab(v)}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 36,
                py: 0.5,
                px: 2,
              },
            }}
          >
            <Tab
              label={
                scenarioConfig?.focusedMfe === 'member'
                  ? `Member Search - ${claim.scenario ?? ''}`
                  : 'Member Search'
              }
            />
            <Tab
              label={
                scenarioConfig?.focusedMfe === 'employerGroup'
                  ? `Employer Group Search - ${claim.scenario ?? ''}`
                  : 'Employer Group Search'
              }
            />
          </Tabs>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <AlwaysMountedPanel visible={activeTab === 0}>
            <MemberSearchPanel
              onMemberSelected={handleMemberSelected}
              fields={scenarioConfig?.memberFields}
              initialCriteria={memberInitialCriteria}
              apiMode={apiMode}
              liveBaseUrl={liveBaseUrl}
              mockBaseUrl={mockBaseUrl}
            />
          </AlwaysMountedPanel>

          <AlwaysMountedPanel visible={activeTab === 1}>
            <EmployerGroupSearchPanel
              onCcodeSelected={(ccode, matchType) => {
                setSelectedCcode(ccode);
                setSelectedMatchType(matchType ?? '');
              }}
              fields={scenarioConfig?.employerFields}
              initialCriteria={egInitialCriteria}
              apiMode={apiMode}
              liveBaseUrl={liveBaseUrl}
              mockBaseUrl={mockBaseUrl}
            />
          </AlwaysMountedPanel>
        </Box>
      </Box>
    </Box>
  );
}
