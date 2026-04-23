// src/components/ClaimInformationPanel.tsx
// Thin orchestrator — owns actionLoading, snackbar, isPended state, and API calls.
//
// isPended is local state (not derived on every render) so it can be updated
// immediately after a successful Pend Claim API call — toggling the button
// states without requiring a claim re-fetch or navigation.
//
// Flow:
//   1. Claim loads with pendedClaim 'N' → isPended = false
//      → Pend Claim enabled, Pend Notes disabled
//   2. User clicks Pend Claim → dialog → notes → Save
//   3. API succeeds → setIsPended(true)
//      → Pend Claim disabled, Pend Notes enabled
//   4. onAction('pendClaim') called → parent handles navigation / next claim

import { useState } from 'react';
import { Alert, Box, Divider, Snackbar } from '@mui/material';
import Collapsible from './shared/Collapsible';
import ClaimInfoGrid from './ClaimInfoGrid';
import ClaimActionBar from './ClaimActionBar';
import PendDialog, { type PendMode } from './PendDialog';
import UpdateCcodeDialog, { type UpdateCcodeForm } from './UpdateCcodeDialog';
import { claimsApi } from '../services/claimsApi';
import type { HaltedClaim } from '../types/claims';

interface Props {
  claim: HaltedClaim;
  onAction: (
    action: 'updateCCode' | 'pendClaim' | 'pendNotes' | 'denyClaim'
  ) => void;
  /** CCode selected in a MFE panel — pre-fills UpdateCcodeDialog. */
  selectedCcode?: string;
  /** Defaults to 'system'. Replace with auth context value when available. */
  userName?: string;
}

export default function ClaimInformationPanel({
  claim,
  onAction,
  selectedCcode,
  userName = 'system',
}: Props) {
  // --------------------------------------------------------------------------
  // Pend state — local so it can be updated after a successful API call
  // without a re-fetch. Initialised from claim.pendedClaim on mount.
  // --------------------------------------------------------------------------
  const [isPended, setIsPended] = useState(claim.pendedClaim === 'Y');

  // --------------------------------------------------------------------------
  // Loading
  // --------------------------------------------------------------------------
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const anyLoading = actionLoading !== null;

  // --------------------------------------------------------------------------
  // Snackbar
  // --------------------------------------------------------------------------
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  // --------------------------------------------------------------------------
  // Pend dialog
  // --------------------------------------------------------------------------
  const [pendOpen, setPendOpen] = useState(false);
  const [pendMode, setPendMode] = useState<PendMode>('pendClaim');

  const handlePendClick = (mode: PendMode) => {
    setPendMode(mode);
    setPendOpen(true);
  };

  const handlePendConfirm = (notes: string) => {
    setActionLoading('pend');
    claimsApi
      .pendClaim({
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        userName,
        pendNotes: notes,
        pended: pendMode === 'pendClaim',
        lockExpiration: 0,
        network: claim.network,
      })
      .then(() => {
        setPendOpen(false);
        // Update local pend state so button states reflect the change immediately.
        // pendClaim → isPended becomes true (Pend Claim disabled, Pend Notes enabled).
        // pendNotes → pend state unchanged (claim was already pended).
        if (pendMode === 'pendClaim') {
          setIsPended(true);
        }
        showSnackbar('Claim pended successfully.', 'success');
        onAction(pendMode);
      })
      .catch(() =>
        showSnackbar('Failed to pend claim. Please try again.', 'error')
      )
      .finally(() => setActionLoading(null));
  };

  // --------------------------------------------------------------------------
  // Deny
  // --------------------------------------------------------------------------
  const handleDenySubmit = (reason: string) => {
    setActionLoading('deny');
    claimsApi
      .denyClaim({
        claimNumber: claim.claimNumber,
        clientClaimNumber: claim.clientClaimId,
        claimType: claim.claimType,
        userName,
        denialReason: reason,
      })
      .then(() => {
        showSnackbar('Claim denied successfully.', 'success');
        onAction('denyClaim');
      })
      .catch(() =>
        showSnackbar('Failed to deny claim. Please try again.', 'error')
      )
      .finally(() => setActionLoading(null));
  };

  // --------------------------------------------------------------------------
  // Update CCode dialog
  // --------------------------------------------------------------------------
  const [updateCcodeOpen, setUpdateCcodeOpen] = useState(false);

  const handleUpdateCcodeConfirm = (form: UpdateCcodeForm) => {
    setActionLoading('updateCcode');
    claimsApi
      .updateCcode({
        policy: form.policy,
        ccode: form.ccode,
        policyAlias: form.policyAlias,
        forceCcode: form.forceCcode,
        serviceDate: claim.serviceDate,
        receiptDate: claim.dateOfReceipt,
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        statusCode: '',
        lockedByUser: userName,
        eligMemberId: form.eligMemberId,
        ccodeRecId: form.ccodeRecId,
        forcePolicy: form.forcePolicy,
      })
      .then(() => {
        setUpdateCcodeOpen(false);
        showSnackbar('CCode updated successfully.', 'success');
        onAction('updateCCode');
      })
      .catch(() =>
        showSnackbar('Failed to update CCode. Please try again.', 'error')
      )
      .finally(() => setActionLoading(null));
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <>
      <Collapsible title='Claim Information' defaultExpanded={true}>
        <Box sx={{ p: 1.5 }}>
          <ClaimInfoGrid claim={claim} />
          <Divider sx={{ my: 1 }} />
          <ClaimActionBar
            claim={claim}
            anyLoading={anyLoading}
            actionLoading={actionLoading}
            isPended={isPended}
            onPendClick={handlePendClick}
            onUpdateCcodeClick={() => setUpdateCcodeOpen(true)}
            onDenySubmit={handleDenySubmit}
          />
        </Box>
      </Collapsible>

      <PendDialog
        open={pendOpen}
        onClose={() => setPendOpen(false)}
        mode={pendMode}
        claimNumber={claim.claimNumber}
        anyLoading={anyLoading}
        isSubmitting={actionLoading === 'pend'}
        onConfirm={handlePendConfirm}
      />

      {/* key forces remount on open — externalCcode is captured at mount time */}
      <UpdateCcodeDialog
        key={updateCcodeOpen ? claim.claimNumber : 'closed'}
        open={updateCcodeOpen}
        onClose={() => setUpdateCcodeOpen(false)}
        claim={claim}
        anyLoading={anyLoading}
        isSubmitting={actionLoading === 'updateCcode'}
        externalCcode={selectedCcode}
        onConfirm={handleUpdateCcodeConfirm}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
