// src/pages/ClientManualMatchDashboard.tsx
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import ClaimInformationPanel from '../components/ClaimInformationPanel';
import MemberSearchPanel from '../components/MemberSearchPanel';
import EmployerGroupSearchPanel from '../components/EmployerGroupSearchPanel';
import { claimsApi } from '../services/claimsApi';
import type { HaltedClaim, NextHaltedClaimResponse } from '../types/claims';

// ============================================================================
// TabPanel
// ============================================================================
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
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column',
      }}
    >
      {value === index && (
        <Box sx={{ height: '100%', width: '100%' }}>{children}</Box>
      )}
    </Box>
  );
}

// ============================================================================
// MAPPER
//
// NextHaltedClaimResponse (live API flat shape) → HaltedClaim (UI shape).
//
// WHY: getNextHaltedClaim returns NextHaltedClaimResponse with field names
// that differ from HaltedClaim (e.g. payerName vs payer, policyNum vs policy).
// ClaimInformationPanel and setClaim both expect HaltedClaim — mapping here
// keeps all other files unchanged.
//
// Field mapping (live → HaltedClaim):
//   insuredFullName     → name
//   insuredGender       → gender
//   insuredDob          → dateOfBirth
//   insuredAddress1     → address
//   payerName           → payer
//   policyNum           → policy
//   grpName             → group
//   dateOfService       → serviceDate
//   receiptDate         → dateOfReceipt
//   claimType (string)  → claimType (cast to union)
//   category  (string)  → category  (cast to union)
//   status    (string)  → status    (cast to union)
// ============================================================================
function mapToHaltedClaim(r: NextHaltedClaimResponse): HaltedClaim {
  return {
    claimNumber: r.claimNumber,
    clientClaimId: r.clientClaimId,
    claimStream: r.claimStream,
    claimType: r.claimType as HaltedClaim['claimType'],
    dateOfReceipt: r.receiptDate,
    serviceDate: r.dateOfService,
    policy: r.policyNum,
    insuredId: r.insuredId,
    ccode: r.ccode,
    group: r.grpName,
    payer: r.payerName,
    sender: r.sender,
    network: r.network,
    name: r.insuredFullName,
    dateOfBirth: r.insuredDob,
    gender: r.insuredGender,
    relationship: r.relationship,
    address: r.insuredAddress1,
    category: r.category as HaltedClaim['category'],
    status: r.status as HaltedClaim['status'],
    lockedBy: null,
    lockedAt: null,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ClientManualMatchDashboard() {
  const { claimId, category, claimType } = useParams<{
    claimId?: string;
    category?: string;
    claimType?: string;
  }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<HaltedClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const loadClaim = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (claimId && !category && !claimType) {
        // Direct access — load by claim number (mock path, typed as HaltedClaim)
        const claimData = await claimsApi.getClaimById(claimId);
        setClaim(claimData);
      } else if (category && claimType) {
        // Queue-based access — use live endpoint
        const urlParams = new URLSearchParams(window.location.search);
        const claimStream = urlParams.get('stream');
        if (!claimStream) {
          setError('Missing claim stream parameter');
          return;
        }

        // pended: derived from the category URL segment.
        // MANUAL_REVIEW_PENDED routes → pended=true; MANUAL_REVIEW → false.
        const pended = category.toUpperCase().includes('PENDED');

        const response = await claimsApi.getNextHaltedClaim({
          lockedByUser: 'system', // replace with auth user once auth is wired
          lockExpiration: 0, // int32 per swagger — no UI-driven value
          network: claimStream, // claimStream IS the network identifier
          pended,
          claimType,
        });

        if (response) {
          // Map live response shape → HaltedClaim so all downstream
          // components (ClaimInformationPanel etc.) remain unchanged.
          const mapped = mapToHaltedClaim(response);
          setClaim(mapped);
          void navigate(`/claim/${response.claimNumber}`, { replace: true });
        } else {
          setError('No claims available in this queue');
        }
      } else {
        setError('Invalid route parameters');
      }
    } catch (err: unknown) {
      console.error('Error loading claim:', err);
      setError('Failed to load claim. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [claimId, category, claimType, navigate]);

  useEffect(() => {
    void loadClaim();
  }, [loadClaim]);

  /**
   * Post-action handler — called by ClaimInformationPanel after a
   * successful API call.
   *
   * pend / deny / resetClaim → navigate to /manual-review.
   *   Claim is no longer actionable in this session.
   *
   * updateCCode → reload claim in place.
   *   User may want to continue reviewing after updating the CCode.
   */
  const handleClaimAction = (
    action:
      | 'updateCCode'
      | 'pendClaim'
      | 'pendNotes'
      | 'denyClaim'
      | 'resetClaim'
  ) => {
    switch (action) {
      case 'pendClaim':
      case 'pendNotes':
      case 'denyClaim':
      case 'resetClaim':
        void navigate('/manual-review');
        break;
      case 'updateCCode':
        void loadClaim();
        break;
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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

  if (error || !claim) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>{error ?? 'Claim not found'}</Alert>
      </Box>
    );
  }

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
        <ClaimInformationPanel claim={claim} onAction={handleClaimAction} />
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
            onChange={handleTabChange}
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
            <MemberSearchPanel network={claim.network} ccode={claim.ccode} />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <EmployerGroupSearchPanel
              network={claim.network}
              ccode={claim.ccode}
            />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
}
