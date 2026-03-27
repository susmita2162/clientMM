// components/EmployerGroupSearchPanel.tsx
import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';

const EmployerGroupSearchWidget = lazy(
  () => import('employerGroupSearchApp/EmployerGroupSearchWidget')
);

interface EmployerGroupSearchPanelProps {
  network: string;
  ccode: string;
}

export default function EmployerGroupSearchPanel({
  network,
  ccode,
}: EmployerGroupSearchPanelProps) {
  // Callbacks from the remote micro-frontend — shape is owned by that app,
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
      <Suspense
        fallback={
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
              <Box sx={{ mt: 2, color: 'text.secondary' }}>
                Loading Employer Group Search...
              </Box>
            </Box>
          </Box>
        }
      >
        <EmployerGroupSearchWidget
          ccode={ccode}
          network={network}
          onEmployerGroupSelected={handleEmployerGroupSelected}
          onClientCodeSelected={handleClientCodeSelected}
          autoSearch={true}
        />
      </Suspense>
    </Box>
  );
}
