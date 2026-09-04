import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ClaimsSearchForm from '../components/ClaimsSearchForm';
import { Box } from '@mui/material';
import type { ClaimsSearchCriteria } from '../types/claims';
import ClaimsTable, {
  type QueueContext,
} from '../components/ClaimsTable/ClaimsTable';
import type { HaltedClaim } from '../types/claims';

export default function ClaimsSearch() {
  const navigate = useNavigate();

  // Handle search
  const handleSearch = useCallback((_criteria: ClaimsSearchCriteria) => {}, []);

  const handleClear = useCallback(() => {}, []);

  // ClaimsTable no longer owns navigation itself — it requires this
  // callback. Same pattern as ManualReviewRoute in main.tsx: this page is
  // always rendered inside <RouterProvider>, so calling useNavigate() here
  // directly is safe and unconditional.
  const handleClaimReady = useCallback(
    (claim: HaltedClaim, queueContext: QueueContext) => {
      void navigate(`/claim/${claim.claimNumber}`, {
        state: { claim, queueContext },
      });
    },
    [navigate]
  );

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <Box sx={{ minWidth: 0, maxHeight: '45vh', overflow: 'auto' }}>
        <ClaimsSearchForm onSearch={handleSearch} onClear={handleClear} />
      </Box>

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <ClaimsTable onClaimReady={handleClaimReady} />
      </Box>
    </Box>
  );
}
