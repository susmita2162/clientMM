// src/pages/ClientManualMatchDashboard.tsx
//
// Two valid entry modes — no other entry path exists:
//
//   1. SEARCH RESULT  — /claim/:claimId  (route param is for the URL only)
//      ManualReviewDashboard navigates here with { state: { claim: HaltedClaim } }
//      after a successful findByClaimId / findByClientClaimId call.
//      The claim is read directly from router state — no API call.
//      After any action the user is returned to /manual-review.
//
//   2. QUEUE MODE  — /claim/:category/:formType/next?stream=<claimStream>
//      ClaimsTable navigates here when the user clicks a count cell.
//      POST /nextHalted fetches the first available halted claim.
//      After every action the next halted claim is loaded automatically.
//      When the queue is empty an informational message is shown.

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

// ── Queue context ─────────────────────────────────────────────────────────────

interface QueueContext {
  claimType: string; // 'HCFA' | 'UB' — uppercase
  pended: boolean;
  network: string;
}

// ── Adapter: NextHaltedClaimResponse → HaltedClaim ───────────────────────────
// Keeps ClaimInformationPanel / ClaimInfoGrid unchanged.

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

// ── TabPanel ──────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role='tabpanel'
      hidden={value !== index}
      sx={{
        height: '100%',
        display: value !== index ? 'none' : 'flex',
        flexDirection: 'column',
      }}
    >
      {value === index && (
        <Box sx={{ height: '100%', width: '100%' }}>{children}</Box>
      )}
    </Box>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientManualMatchDashboard() {
  // Route params — :claimId is present in mode 1 (search result URL),
  // :category + :formType are present in mode 2 (queue).
  const { category, formType } = useParams<{
    claimId?: string;
    category?: string;
    formType?: string;
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

  // CCode selected in a MFE panel — passed to UpdateCcodeDialog.
  // Reset on every new claim load.
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
        lockExpiration: 30,
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

    // MODE 1 — search result: claim already in router state, no API call.
    const stateClaim = (location.state as { claim?: HaltedClaim } | null)
      ?.claim;
    if (stateClaim) {
      setClaim(stateClaim);
      setLoading(false);
      return;
    }

    // MODE 2 — queue: category + formType params present.
    if (category && formType) {
      const claimStream = searchParams.get('stream') ?? '';
      const ctx: QueueContext = {
        claimType: formType.toUpperCase(), // 'hcfa' → 'HCFA'
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

  // ── Scenario field config ─────────────────────────────────────────────────

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

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <TabPanel value={activeTab} index={0}>
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
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
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
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
}
