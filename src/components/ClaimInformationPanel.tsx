// src/components/ClaimInformationPanel.tsx
// Thin orchestrator — owns actionLoading, snackbar, and all API call logic.
// Composes: ClaimInfoGrid, ClaimActionBar, PendDialog, UpdateCcodeDialog.
//
// userName: optional prop, defaults to 'system'.
// Replace default with value from auth context once auth is wired:
//   <ClaimInformationPanel ... userName={authUser.name} />
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
    action:
      | 'updateCCode'
      | 'pendClaim'
      | 'pendNotes'
      | 'denyClaim'
      | 'resetClaim'
  ) => void;
  /**
   * Authenticated user name sent in API requests (userName / lockedByUser).
   * Defaults to 'system'. Pass from auth context once available:
   *   <ClaimInformationPanel userName={user.name} ... />
   */
  userName?: string;
}

export default function ClaimInformationPanel({
  claim,
  onAction,
  userName = 'system',
}: Props) {
  // --------------------------------------------------------------------------
  // Shared state — single source of truth for in-flight action tracking.
  // All child components receive anyLoading / actionLoading as props.
  // --------------------------------------------------------------------------
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const anyLoading = actionLoading !== null;

  // --------------------------------------------------------------------------
  // Snackbar — shared feedback channel for all actions.
  // --------------------------------------------------------------------------
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  // --------------------------------------------------------------------------
  // Pend dialog open state + mode — dialog owns notes form state internally.
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
        lockExpiration: 0, // int32 per swagger — no UI-driven value
        network: claim.network,
      })
      .then(() => {
        setPendOpen(false);
        showSnackbar('Claim pended successfully.', 'success');
        onAction(pendMode);
      })
      .catch(() =>
        showSnackbar('Failed to pend claim. Please try again.', 'error')
      )
      .finally(() => setActionLoading(null));
  };

  // --------------------------------------------------------------------------
  // Deny — validation dialog lives in ClaimActionBar (no form state needed).
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
  // UpdateCcode dialog open state — dialog owns form state internally.
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
        statusCode: '', // string per swagger — no UI-driven value
        lockedByUser: userName,
        eligMemberId: form.eligMemberId, // int64 per swagger
        ccodeRecId: form.ccodeRecId, // int64 per swagger
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
  // Reset — confirmation dialog lives in ClaimActionBar (no form state).
  // --------------------------------------------------------------------------
  const handleResetSubmit = () => {
    setActionLoading('reset');
    claimsApi
      .resetClaim({
        claimType: claim.claimType,
        network: claim.network,
        statusCode: 0, // int64 per swagger — no UI-driven value
        pended: false,
      })
      .then(() => {
        showSnackbar('Claim reset successfully.', 'success');
        onAction('resetClaim');
      })
      .catch(() =>
        showSnackbar('Failed to reset claim. Please try again.', 'error')
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
            onPendClick={handlePendClick}
            onUpdateCcodeClick={() => setUpdateCcodeOpen(true)}
            onDenySubmit={handleDenySubmit}
            onResetSubmit={handleResetSubmit}
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

      <UpdateCcodeDialog
        key={updateCcodeOpen ? claim.claimNumber : 'closed'}
        open={updateCcodeOpen}
        onClose={() => setUpdateCcodeOpen(false)}
        claim={claim}
        anyLoading={anyLoading}
        isSubmitting={actionLoading === 'updateCcode'}
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
