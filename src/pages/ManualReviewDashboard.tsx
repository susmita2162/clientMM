// src/pages/ManualReviewDashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import ClaimsSearchForm, {
  type ClaimSearchParams,
} from '../components/ClaimsSearchForm';
import ClaimsTable from '../components/ClaimsTable/ClaimsTable';
import Collapsible from '../components/shared/Collapsible';
import NotFoundDialog from '../components/shared/NotFoundDialog';
import { claimsApi } from '../services/claimsApi';
import { adaptHaltedClaimResponse } from '../utils/claimAdapters';

export default function ManualReviewDashboard() {
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  /**
   * Handles the search form submission.
   *
   * Priority: claimNumber (EDP) is tried first when both fields are filled.
   *
   * Both search methods return HaltedClaimApiResponse | null:
   *   null  → claim not found / not halted / locked → show NotFoundDialog
   *   value → adapt and navigate to ClientManualMatchDashboard
   */
  const handleClaimSearch = async (params: ClaimSearchParams) => {
    try {
      let raw = null;

      if (params.claimNumber) {
        raw = await claimsApi.searchByClaimId(params.claimNumber);
      } else if (params.clientClaimId) {
        raw = await claimsApi.searchByClientClaimId(params.clientClaimId);
      } else {
        setErrorMessage('Please enter a Claim Number or Client Claim ID.');
        setShowNotFoundDialog(true);
        return;
      }

      if (raw) {
        const claim = adaptHaltedClaimResponse(raw);
        void navigate(`/claim/${claim.claimNumber}`, { state: { claim } });
      } else {
        setErrorMessage(
          'The specified claim was not found. Either it is not a halted claim, ' +
            'it is locked by another user, or it does not exist.'
        );
        setShowNotFoundDialog(true);
      }
    } catch {
      setErrorMessage('An error occurred while searching for the claim.');
      setShowNotFoundDialog(true);
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        overflow: 'auto',
      }}
    >
      <ClaimsSearchForm
        onSearch={() => undefined}
        onClear={() => undefined}
        onClaimSearch={handleClaimSearch}
      />

      {/* Claim Counts — collapsible with claims summary table */}
      <Collapsible title='Claim Counts' defaultExpanded={true}>
        <ClaimsTable />
      </Collapsible>

      {/* Halted Claim Not Found dialog */}
      <NotFoundDialog
        open={showNotFoundDialog}
        onClose={() => setShowNotFoundDialog(false)}
        message={errorMessage}
      />
    </Box>
  );
}
