// components/MemberSearchPanel.tsx
import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';

const MemberSearchWidget = lazy(
  () => import('memberSearchApp/MemberSearchWidget')
);

interface MemberSearchPanelProps {
  network: string;
  ccode: string;
}

export default function MemberSearchPanel({
  network,
  ccode,
}: MemberSearchPanelProps) {
  // Callback from the remote micro-frontend — shape is owned by that app,
  // so `unknown` is the correct type here rather than `any`.
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
                Loading Member Search...
              </Box>
            </Box>
          </Box>
        }
      >
        <MemberSearchWidget
          network={network}
          ccode={ccode}
          onMemberSelected={handleMemberSelected}
          autoSearch={true}
        />
      </Suspense>
    </Box>
  );
}
