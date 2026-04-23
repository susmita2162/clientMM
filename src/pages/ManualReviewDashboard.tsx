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

export default function ManualReviewDashboard() {
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  /**
   * Handles the search form submission.
   *
   * ClaimsSearchForm passes { claimNumber?, clientClaimId? } so we can route
   * to the correct live endpoint without guessing:
   *   claimNumber   → GET /api/clientMatch/claim/findByClaimId/{id}
   *   clientClaimId → GET /api/clientMatch/claim/findByClientClaimId/{id}
   *
   * Priority: claimNumber (EDP) takes precedence when both fields are filled,
   * matching the ClaimsSearchForm ClaimSearchParams comment.
   *
   * On success: navigate to /claim/:claimNumber passing the already-adapted
   * HaltedClaim in router state — ClientManualMatchDashboard reads it directly,
   * no re-fetch needed (there is no live endpoint for fetching by ID).
   *
   * On not-found / locked / error: show NotFoundDialog.
   */
  const handleClaimSearch = async (params: ClaimSearchParams) => {
    try {
      let result;

      if (params.claimNumber) {
        result = await claimsApi.searchByClaimId(params.claimNumber);
      } else if (params.clientClaimId) {
        result = await claimsApi.searchByClientClaimId(params.clientClaimId);
      } else {
        // Both fields empty — form validation should prevent this.
        setErrorMessage('Please enter a Claim Number or Client Claim ID.');
        setShowNotFoundDialog(true);
        return;
      }

      if (result.found && result.claim) {
        // Claim already adapted to HaltedClaim by the API layer.
        // Pass via router state — no second API call on the dashboard.
        void navigate(`/claim/${result.claim.claimNumber}`, {
          state: { claim: result.claim },
        });
      } else {
        setErrorMessage(
          result.message ??
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
