// CLAIMS-SUM (Host)
// src/components/EmployerGroupSearchPanel.tsx
// ============================================================================
// Changes from original:
//   1. MfeErrorBoundary added — catches MFE load failures (remote app down,
//      network error, bundle unavailable) and shows a user-friendly message.
//   2. Suspense fallback layout fixed — CircularProgress and text were
//      rendering side-by-side (flexDirection: 'column' was missing on parent).
//      Extracted as EmployerGroupSearchFallback for clarity.
//
// Props interface: UNCHANGED — still accepts only network and ccode.
// ClientManualMatchDashboard.tsx: NO CHANGES REQUIRED.
// ============================================================================

import { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';

const EmployerGroupSearchWidget = lazy(
  () => import('employerGroupSearchApp/EmployerGroupSearchWidget')
);

interface EmployerGroupSearchPanelProps {
  network: string;
  ccode: string;
}

// ── Suspense fallback — extracted for readability, fixes layout bug ────────
function EmployerGroupSearchFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column', // was missing — caused side-by-side layout
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        gap: 2,
      }}
    >
      <CircularProgress size={40} />
      <Typography variant='body2' color='text.secondary'>
        Loading Employer Group Search...
      </Typography>
    </Box>
  );
}

// ============================================================================
// Component
// ============================================================================
export default function EmployerGroupSearchPanel({
  network,
  ccode,
}: EmployerGroupSearchPanelProps) {
  // Callbacks from the remote MFE — shape is owned by that app,
  // so `unknown` is the correct type here rather than `any`.
  const handleEmployerGroupSelected = (group: unknown) => {
    console.warn('Employer Group selected in host:', group);
  };

  const handleClientCodeSelected = (client: unknown) => {
    console.warn('Client Code selected in host:', client);
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <MfeErrorBoundary mfeName='Employer Group Search'>
        <Suspense fallback={<EmployerGroupSearchFallback />}>
          <EmployerGroupSearchWidget
            ccode={ccode}
            network={network}
            onEmployerGroupSelected={handleEmployerGroupSelected}
            onClientCodeSelected={handleClientCodeSelected}
            autoSearch={true}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
