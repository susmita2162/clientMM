// src/pages/ManualReviewDashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import ClaimsSearchForm from '../components/ClaimsSearchForm';
import type { ClaimSearchParams } from '../components/ClaimsSearchForm';
import ClaimsTable from '../components/ClaimsTable/ClaimsTable';
import Collapsible from '../components/shared/Collapsible';
import NotFoundDialog from '../components/shared/NotFoundDialog';
import { claimsApi } from '../services/claimsApi';
import type { ClaimSearchResult, ClaimsSearchCriteria } from '../types/claims';

/**
 * ManualReviewDashboard Page
 *
 * Main dashboard for claims review with:
 * - Search Criteria collapsible — search by EDP Claim ID or Client Claim ID
 * - Claim Counts collapsible — claims summary table with queue navigation
 * - Not Found dialog for locked / missing claims
 *
 * Search routing (live API has two separate endpoints):
 *   claimNumber filled  → GET /api/clientMatch/claim/findByClaimId/{id}
 *   clientClaimId filled → GET /api/clientMatch/claim/findByClientClaimId/{id}
 *   both filled          → claimNumber (EDP) takes precedence
 */
export default function ManualReviewDashboard() {
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  /**
   * Handle claim search.
   *
   * Routes to the correct live endpoint based on which field the user filled:
   *   claimNumber  → searchByClaimId  (EDP Claim ID endpoint)
   *   clientClaimId → searchByClientClaimId (Client Claim ID endpoint)
   *
   * On success: navigate to /claim/:claimNumber (Client Manual Match Dashboard).
   * On not found / locked: show the "Halted Claim Not Found" dialog.
   * On API error: show dialog with generic error message.
   */
  const handleClaimSearch = async (params: ClaimSearchParams) => {
    try {
      // Guard — both fields empty, form should prevent this but be safe.
      if (!params.claimNumber && !params.clientClaimId) return;

      // Single const: TypeScript infers result as ClaimSearchResult from both
      // branches — no untyped `let result` needed.
      const result: ClaimSearchResult = await (params.claimNumber
        ? claimsApi.searchByClaimId(params.claimNumber)
        : claimsApi.searchByClientClaimId(params.clientClaimId ?? ''));

      if (result.found && result.claim) {
        void navigate(`/claim/${result.claim.claimNumber}`);
      } else {
        setErrorMessage(
          result.message ??
            'The specified claim was not found. Either it is not a halted claim, ' +
              'it is locked by another user, or it does not exist.'
        );
        setShowNotFoundDialog(true);
      }
    } catch (err: unknown) {
      console.error('[ManualReviewDashboard] Error searching for claim:', err);
      setErrorMessage(
        'An error occurred while searching for the claim. Please try again.'
      );
      setShowNotFoundDialog(true);
    }
  };

  /**
   * Handle generic search (not currently used — ClaimsSearchForm delegates
   * to onClaimSearch when either ID field is filled).
   * Kept for ClaimsSearchForm prop contract compatibility.
   */
  const handleSearch = (_criteria: ClaimsSearchCriteria) => {
    // No-op: ID search via handleClaimSearch covers all current use cases.
  };

  /** Handle form clear — no local state to clear beyond the form itself. */
  const handleClear = () => {
    // Form state is owned by ClaimsSearchForm (react-hook-form reset).
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
      {/* Search Criteria — collapsible with EDP + Client Claim ID search */}
      <ClaimsSearchForm
        onSearch={handleSearch}
        onClear={handleClear}
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
