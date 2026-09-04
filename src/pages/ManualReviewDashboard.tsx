// src/pages/ManualReviewDashboard.tsx
import { useState } from 'react';
import { Box } from '@mui/material';
import ClaimsSearchForm, {
  type ClaimSearchParams,
} from '../components/ClaimsSearchForm';
import ClaimsTable, {
  type QueueContext,
} from '../components/ClaimsTable/ClaimsTable';
import Collapsible from '../components/shared/Collapsible';
import NotFoundDialog from '../components/shared/NotFoundDialog';
import { claimsApi } from '../services/claimsApi';
import { adaptHaltedClaimResponse } from '../utils/claimAdapters';
import type { HaltedClaim } from '../types/claims';
import type { UserContext } from '../types/auth';

interface ManualReviewDashboardProps {
  /**
   * Fired whenever a claim is found — via the search form, or via a Claim
   * Counts table cell. This component never imports react-router or any
   * other router; the host owns navigation entirely and supplies it here
   * (react-router's navigate() in the standalone app, Next's
   * router.push() in Chassis).
   */
  readonly onClaimFound: (
    claim: HaltedClaim,
    queueContext?: QueueContext
  ) => void;
  /**
   * Current user's permission context. Optional here since not every
   * internal action currently needs a permission check — accepted so the
   * prop chassis already sends has somewhere to go, and so any
   * SecuredRoute-gated action added later can read it via useAccessControl.
   */
  readonly userContext?: UserContext;
}

export default function ManualReviewDashboard({
  onClaimFound,
  userContext,
}: ManualReviewDashboardProps) {
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Handles the search form submission.
   *
   * Priority: claimNumber (EDP) is tried first when both fields are filled.
   *
   * Both search methods return HaltedClaimApiResponse | null:
   *   null  → claim not found / not halted / locked → show NotFoundDialog
   *   value → adapt and call onClaimFound
   */
  const handleClaimSearch = async (params: ClaimSearchParams) => {
    try {
      let raw = null;

      if (params.claimNumber) {
        raw = await claimsApi.searchByClaimId(
          params.claimNumber,
          userContext?.userId ?? 'system'
        );
      } else if (params.clientClaimId) {
        raw = await claimsApi.searchByClientClaimId(
          params.clientClaimId,
          userContext?.userId ?? 'system'
        );
      } else {
        setErrorMessage('Please enter a Claim Number or Client Claim ID.');
        setShowNotFoundDialog(true);
        return;
      }

      if (raw) {
        const claim = adaptHaltedClaimResponse(raw);
        onClaimFound(claim);
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
        <ClaimsTable
          userName={userContext?.userId ?? 'system'}
          onClaimReady={onClaimFound}
        />
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
