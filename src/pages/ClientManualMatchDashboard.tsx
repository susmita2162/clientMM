// src/pages/ClientManualMatchDashboard.tsx
//
// Two valid entry modes:
//
//   1. SEARCH RESULT  — /claim/:claimId
//      Claim arrives via router state { claim: HaltedClaim }. No API call.
//      After any action → return to /manual-review.
//
//   2. QUEUE MODE — /claim/:category/:claimType/next?stream=<claimStream>
//      Route param is :claimType (NOT :formType — matches main.tsx definition).
//      POST /nextHalted fetches the first available halted claim.
//      lockExpiration: 15 (minutes) — claim locked to current user for 15 mins.
//      After every action → next halted claim loaded automatically.
//      Queue empty → informational message shown.
//
// MFE tab rendering:
//   Both panels always mounted. Visibility via CSS only (display none/flex).
//   Prevents MFEs unmounting/remounting on tab switch and re-firing autoSearch.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
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
import { claimsApi } from '../services/claimsApi';
import { getScenarioConfig } from '../utils/scenarioFieldConfig';
import type { HaltedClaim, NextHaltedClaimResponse } from '../types/claims';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Lock duration in minutes.
 * The claim is locked to the current user for this period.
 * If no action is taken within this window, the server releases the lock
 * and the claim re-enters the halted queue automatically.
 */
const LOCK_EXPIRATION_MINUTES = 15;

// ── Queue context ─────────────────────────────────────────────────────────────

interface QueueContext {
  claimType: string; // 'HCFA' | 'UB' — uppercase
  pended: boolean;
  network: string;
}

// ── Adapter: NextHaltedClaimResponse → HaltedClaim ───────────────────────────

function adaptNextHaltedToHaltedClaim(r: NextHaltedClaimResponse): HaltedClaim {
  return {
    claimNumber: r.claimNumber ?? '',
    clientClaimId: r.clientClaimId ?? '',
    claimStream: r.claimStream ?? '',
    claimType: (r.claimType as 'HCFA' | 'UB') ?? 'HCFA',
    dateOfReceipt: r.receiptDate ?? '',
    serviceDate: r.dateOfService ?? '',
    policy: r.policyNum ?? '',
    insuredId: r.insuredId ?? '',
    ccode: r.ccode ?? '',
    group: r.grpName ?? '',
    payer: r.payerName ?? '',
    sender: r.sender ?? '',
    network: r.network ?? '',
    name:
      r.insuredFullName ||
      [r.insuredFirstName, r.insuredLastName].filter(Boolean).join(' '),
    dateOfBirth: r.insuredDob || r.memberDob || '',
    gender: r.insuredGender ?? '',
    relationship: r.relationship ?? '',
    address: [r.insuredAddress1, r.insuredCityStateZip]
      .filter(Boolean)
      .join(', '),
    category: r.pendedClaim === 'Y' ? 'MANUAL_REVIEW_PENDED' : 'MANUAL_REVIEW',
    status: 'HALTED',
    lockedBy: null,
    lockedAt: null,
    pendedClaim: r.pendedClaim ?? 'N',
    scenario: r.scenario ?? '',
    matchType: r.matchType ?? 'HALT',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientManualMatchDashboard() {
  // Route param name matches main.tsx: claim/:category/:claimType/next
  // Previously read as 'formType' which was always undefined — fixed here.
  const { category, claimType: claimTypeParam } = useParams<{
    claimId?: string;
    category?: string;
    claimType?: string; // matches route definition in main.tsx
  }>();

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────

  // claim is always stored as HaltedClaim — both entry modes converge here.
  const [claim, setClaim] = useState<HaltedClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueEmpty, setQueueEmpty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // CCode selected in a MFE panel. Reset on every new claim load.
  const [selectedCcode, setSelectedCcode] = useState('');

  const queueContextRef = useRef<QueueContext | null>(null);
  const hasInitialized = useRef(false);

  // ── Queue loader ───────────────────────────────────────────────────────────

  const loadNextHaltedClaim = useCallback(async (ctx: QueueContext) => {
    setLoading(true);
    setError(null);
    setQueueEmpty(false);
    setSelectedCcode('');
    try {
      const response = await claimsApi.getNextHaltedClaim({
        claimType: ctx.claimType,
        pended: ctx.pended,
        network: ctx.network,
        lockedByUser: 'SYSTEM', // replace with auth user when available
        lockExpiration: LOCK_EXPIRATION_MINUTES,
      });

      if (response) {
        setClaim(adaptNextHaltedToHaltedClaim(response));
        setActiveTab(0);
      } else {
        setQueueEmpty(true);
      }
    } catch {
      setError('Failed to load next claim. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initialisation ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Mode 1 — search result: claim already in router state, no API call.
    const stateClaim = (location.state as { claim?: HaltedClaim } | null)
      ?.claim;
    if (stateClaim) {
      setClaim(stateClaim);
      setLoading(false);
      return;
    }

    // Mode 2 — queue: category + claimType params present.
    // claimTypeParam comes from :claimType in the route (e.g. 'hcfa', 'ub').
    if (category && claimTypeParam) {
      const claimStream = searchParams.get('stream') ?? '';
      const ctx: QueueContext = {
        claimType: claimTypeParam.toUpperCase(), // 'hcfa' → 'HCFA'
        pended: category === 'manual-pended',
        network: claimStream,
      };
      queueContextRef.current = ctx;
      void loadNextHaltedClaim(ctx);
      return;
    }

    // Neither — invalid navigation.
    setError(
      'No claim data available. Please search for a claim or select one from the dashboard.'
    );
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Action handler ─────────────────────────────────────────────────────────

  const handleClaimAction = useCallback(
    (
      _action:
        | 'updateCCode'
        | 'pendClaim'
        | 'pendNotes'
        | 'denyClaim'
        | 'resetClaim'
    ) => {
      if (queueContextRef.current) {
        // Queue mode — load the next claim for every action type.
        void loadNextHaltedClaim(queueContextRef.current);
      } else {
        // Search result mode — return to dashboard after action.
        void navigate('/manual-review');
      }
    },
    [loadNextHaltedClaim, navigate]
  );

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
          <Typography variant='subtitle1' fontWeight={600} gutterBottom>
            Queue Complete
          </Typography>
          <Typography variant='body2'>
            There are no more halted claims available in this queue. All claims
            have been processed or are locked by another user.
          </Typography>
        </Alert>
        <Button
          variant='contained'
          onClick={() => void navigate('/manual-review')}
        >
          Return to Manual Review Dashboard
        </Button>
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
        {/* <Button
          variant='outlined'
          onClick={() => void navigate('/manual-review')}
        >
          Return to Manual Review Dashboard
        </Button> */}
      </Box>
    );
  }

  // ── Scenario config ───────────────────────────────────────────────────────

  const scenarioConfig = getScenarioConfig(claim.scenario ?? '');

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
      <Box sx={{ flexShrink: 0 }}>
        <ClaimInformationPanel
          claim={claim}
          onAction={handleClaimAction}
          selectedCcode={selectedCcode || undefined}
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
        {/* Tab bar */}
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
            <Tab label='Member Search' />
            <Tab label='Employer Group Search' />
          </Tabs>
        </Box>

        {/*
          Both panels always mounted — CSS-only show/hide prevents MFEs
          from unmounting and re-firing autoSearch on tab switch.
        */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: activeTab === 0 ? 'flex' : 'none',
              height: '100%',
              width: '100%',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <MemberSearchPanel
              network={claim.network}
              ccode={claim.ccode}
              insuredId={claim.insuredId}
              serviceDate={claim.serviceDate}
              insuredFirstName={claim.name.split(' ')[0]}
              insuredLastName={claim.name.split(' ').slice(1).join(' ')}
              insuredDob={claim.dateOfBirth}
              insuredGender={claim.gender}
              scenario={claim.scenario}
              focusedFields={scenarioConfig?.memberFocused}
              highlightedFields={scenarioConfig?.memberHighlighted}
              onCcodeSelected={setSelectedCcode}
            />
          </Box>

          <Box
            sx={{
              display: activeTab === 1 ? 'flex' : 'none',
              height: '100%',
              width: '100%',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <EmployerGroupSearchPanel
              network={claim.network}
              ccode={claim.ccode}
              policyNum={claim.policy}
              grpName={claim.group}
              payerName={claim.payer}
              scenario={claim.scenario}
              focusedFields={scenarioConfig?.employerFocused}
              highlightedFields={scenarioConfig?.employerHighlighted}
              onCcodeSelected={setSelectedCcode}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
