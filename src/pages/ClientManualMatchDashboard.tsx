// src/pages/ClientManualMatchDashboard.tsx
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import ClaimInformationPanel from '../components/ClaimInformationPanel';
import MemberSearchPanel from '../components/MemberSearchPanel';
import EmployerGroupSearchPanel from '../components/EmployerGroupSearchPanel';
import { claimsApi } from '../services/claimsApi';
import type { HaltedClaim } from '../types/claims';

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
        const claimData = await claimsApi.getClaimById(claimId);
        setClaim(claimData);
      } else if (category && claimType) {
        const urlParams = new URLSearchParams(window.location.search);
        const claimStream = urlParams.get('stream');
        if (!claimStream) {
          setError('Missing claim stream parameter');
          return;
        }
        const result = await claimsApi.getNextClaimFromQueue({
          claimStream,
          category,
          claimType,
        });
        if (result.claim) {
          setClaim(result.claim);
          void navigate(`/claim/${result.claim.claimNumber}`, {
            replace: true,
          });
        } else {
          setError('No claims available in this queue');
        }
      } else {
        setError('Invalid route parameters');
      }
    } catch (err) {
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
   * Post-action handler — called by ClaimInformationPanel after a successful API call.
   *
   * pend/deny/reset: navigate back to /manual-review so the user can pick the
   *   next claim. The pended/denied claim is no longer actionable in this session.
   *
   * updateCCode: stay on the current claim — the user may want to continue
   *   reviewing after a CCode update.
   *
   * resetClaim: navigate back to /manual-review — reset clears the search state
   *   so the current context is stale.
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
        // Stay — reload claim to reflect updated CCode
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
