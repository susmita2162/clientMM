// src/pages/ClientManualMatchDashboard.tsx
//
// Single entry point: claim always arrives via router state.
//
//   state = { claim: HaltedClaim }
//     → Search result mode. After any action → return to /manual-review.
//
//   state = { claim: HaltedClaim, queueContext: QueueContext }
//     → Queue mode. After every action → nextHalted → next claim.
//       Queue empty → informational message shown.
//
// Scenario field config:
//   getScenarioConfig(claim.scenario) produces memberFocused, memberHighlighted,
//   employerFocused, employerHighlighted arrays. These are forwarded to the
//   respective panels → widget → form → yellow TextField sx per scenario matrix.
//   Returns null for unrecognised scenarios (panels receive undefined → no highlight).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { adaptNextHaltedToHaltedClaim } from '../utils/claimAdapters';
import type { HaltedClaim } from '../types/claims';

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCK_EXPIRATION_MINUTES = 15;

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueContext {
  claimType: string; // API value: 'H' | 'U' | ''
  pended: boolean;
  network: string;
}

// ── AlwaysMountedPanel ────────────────────────────────────────────────────────

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

export default function ClientManualMatchDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [claim, setClaim] = useState<HaltedClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueEmpty, setQueueEmpty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
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
        lockedByUser: 'SYSTEM',
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
  // Claim always arrives via router state — no URL param parsing needed.
  // queueContext is optional: present → queue mode, absent → search mode.

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const state = location.state as {
      claim?: HaltedClaim;
      queueContext?: QueueContext;
    } | null;

    if (state?.claim) {
      setClaim(state.claim);
      if (state.queueContext) {
        queueContextRef.current = state.queueContext;
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
        void loadNextHaltedClaim(queueContextRef.current);
      } else {
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
        <Button
          variant='outlined'
          onClick={() => void navigate('/manual-review')}
        >
          Return to Manual Review Dashboard
        </Button>
      </Box>
    );
  }

  // ── Scenario config ───────────────────────────────────────────────────────
  // null when scenario is absent/unrecognised → panels receive undefined
  // for focusedFields/highlightedFields → no highlighting applied.

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
      {/* Claim Information — live Client Code display */}
      <Box sx={{ flexShrink: 0 }}>
        <ClaimInformationPanel
          claim={claim}
          onAction={handleClaimAction}
          selectedCcode={selectedCcode || undefined}
        />
      </Box>

      {/* MFE tabs */}
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
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/*
           * MemberSearchPanel → MemberSearchWidget → MemberSearch
           * focusedFields  = scenario.memberFocused  (pre-populate + yellow)
           * highlightedFields = scenario.memberHighlighted (yellow only)
           */}
          <AlwaysMountedPanel visible={activeTab === 0}>
            <MemberSearchPanel
              network={claim.network}
              ccode={claim.ccode}
              onCcodeSelected={setSelectedCcode}
              focusedFields={scenarioConfig?.memberFocused}
              highlightedFields={scenarioConfig?.memberHighlighted}
            />
          </AlwaysMountedPanel>

          {/*
           * EmployerGroupSearchPanel → EmployerGroupSearchWidget → EmployerGroupSearchForm
           * focusedFields  = scenario.employerFocused  (pre-populate + yellow)
           * highlightedFields = scenario.employerHighlighted (yellow only)
           * Field mapping applied in EmployerGroupSearchForm via EG_FIELD_TO_FORM_KEY.
           */}
          <AlwaysMountedPanel visible={activeTab === 1}>
            <EmployerGroupSearchPanel
              network={claim.network}
              ccode={claim.ccode}
              onCcodeSelected={setSelectedCcode}
              focusedFields={scenarioConfig?.employerFocused}
              highlightedFields={scenarioConfig?.employerHighlighted}
            />
          </AlwaysMountedPanel>
        </Box>
      </Box>
    </Box>
  );
}
