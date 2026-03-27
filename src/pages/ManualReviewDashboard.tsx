// src/pages/ManualReviewDashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import ClaimsSearchForm from '../components/ClaimsSearchForm';
import ClaimsTable from '../components/ClaimsTable/ClaimsTable';
import Collapsible from '../components/shared/Collapsible';
import NotFoundDialog from '../components/shared/NotFoundDialog';
import { claimsApi } from '../services/claimsApi';
import type { ClaimsSearchCriteria } from '../types/claims';

/**
 * ManualReviewDashboard Page
 *
 * Main dashboard for claims review with:
 * - Search functionality for specific claims (by EDP or Client ID)
 * - Claims summary table showing counts by stream and category
 * - Navigation to Client Manual Match dashboard
 *
 * Features:
 * - Search Criteria collapsible with claim ID search
 * - Claim Counts collapsible with claims summary table
 * - Error handling for claim not found scenarios
 * - Queue-based navigation when clicking claim counts
 */
export default function ManualReviewDashboard() {
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  /**
   * Handle claim search by EDP Claim ID or Client Claim ID
   * Searches for specific claim and navigates if found
   * Shows error dialog if not found or locked
   */
  const handleClaimSearch = async (claimId: string) => {
    try {
      const result = await claimsApi.searchHaltedClaim(claimId);

      if (result.found && result.claim) {
        // Navigate to specific claim detail page (removed 'edp' prefix)
        void navigate(`/claim/${result.claim.claimNumber}`);
      } else {
        // Show not found dialog with appropriate message
        setErrorMessage(
          result.message ||
            'The specified claim was not found. Either it is not a halted claim, ' +
              'it is locked by another user, or it does not exist.'
        );
        setShowNotFoundDialog(true);
      }
    } catch (error) {
      // Handle API errors
      console.error('Error searching for claim:', error);
      setErrorMessage('An error occurred while searching for the claim.');
      setShowNotFoundDialog(true);
    }
  };

  /**
   * Handle search form clear
   * Kept for backward compatibility with ClaimsSearchForm
   */
  const handleClear = () => {
    // Currently no state to clear in this component
    // Can be extended if needed
  };

  /**
   * Handle generic search
   * Kept for backward compatibility with ClaimsSearchForm
   */
  const handleSearch = (_criteria: ClaimsSearchCriteria) => {
    // Currently not used as we're using handleClaimSearch instead
    // Kept for backward compatibility
    // console.log('Search criteria:', criteria);
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
      {/* ClaimsSearchForm - Already has its own Accordion, no wrapper needed */}
      <ClaimsSearchForm
        onSearch={handleSearch}
        onClear={handleClear}
        onClaimSearch={handleClaimSearch}
      />

      {/* Claim Counts Collapsible - Wraps ClaimsTable */}
      <Collapsible title='Claim Counts' defaultExpanded={true}>
        <ClaimsTable />
      </Collapsible>

      {/* Not Found Dialog */}
      <NotFoundDialog
        open={showNotFoundDialog}
        onClose={() => setShowNotFoundDialog(false)}
        message={errorMessage}
      />
    </Box>
  );
}
