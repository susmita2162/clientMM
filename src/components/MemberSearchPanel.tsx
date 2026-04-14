// CLAIMS-SUM (Host)
// src/components/MemberSearchPanel.tsx
// ============================================================================
// Changes from original (minimal):
//   1. mode="embedded" added to <MemberSearchWidget /> call — this is the
//      sole trigger for the embedded field set in the MFE.
//   2. Suspense fallback layout fixed: CircularProgress and text were
//      rendering side-by-side (missing flexDirection: 'column' on parent).
//      Extracted as MemberSearchFallback for clarity.
//
// Props interface: UNCHANGED — still accepts only network and ccode.
// ClientManualMatchDashboard.tsx: NO CHANGES REQUIRED.
// ============================================================================

import { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';

const MemberSearchWidget = lazy(
  () => import('memberSearchApp/MemberSearchWidget')
);

interface MemberSearchPanelProps {
  network: string;
  ccode: string;
}

// ── Suspense fallback — extracted for readability, fixes layout bug ────────
function MemberSearchFallback() {
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
        Loading Member Search...
      </Typography>
    </Box>
  );
}

// ============================================================================
// Component
// ============================================================================
export default function MemberSearchPanel({
  network,
  ccode,
}: MemberSearchPanelProps) {
  // Callback from the remote MFE — shape is owned by that app,
  // so `unknown` is the correct type here. Unchanged from original.
  const handleMemberSelected = (member: unknown) => {
    console.warn('Member selected in host:', member);
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
      <MfeErrorBoundary mfeName='Member Search'>
        <Suspense fallback={<MemberSearchFallback />}>
          <MemberSearchWidget
            network={network}
            ccode={ccode}
            onMemberSelected={handleMemberSelected}
            autoSearch={true}
            // mode="embedded" is the only addition to this call
            mode='embedded'
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
