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

// Update CCode:
//   Button is always enabled (no MFE selection required).
//   ccode value used: selectedCcode (from MFE) when available, else claim.ccode.
//   No dialog — direct API call.

import { useState } from 'react';
import { Alert, Box, Divider, Snackbar } from '@mui/material';
import Collapsible from './shared/Collapsible';
import ClaimInfoGrid from './ClaimInfoGrid';
import ClaimActionBar from './ClaimActionBar';
import PendDialog, { type PendMode } from './PendDialog';
import { claimsApi } from '../services/claimsApi';
import type { HaltedClaim } from '../types/claims';

interface Props {
  claim: HaltedClaim;
  onAction: (
    action: 'updateCCode' | 'pendClaim' | 'pendNotes' | 'denyClaim'
  ) => void;
  /**
   * CCode selected in a MFE panel (Member Search → ccode, Employer Group → clientCode).
   * Used as the ccode value when present; falls back to claim.ccode otherwise.
   */
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

  // ── Update CCode — always enabled, no dialog ───────────────────────────────
  const handleUpdateCcodeClick = () => {
    // Use MFE-selected ccode when available; fall back to the claim's own ccode.
    const ccodeToSubmit = selectedCcode || claim.ccode;

    setActionLoading('updateCcode');
    claimsApi
      .updateCcode({
        ccode: ccodeToSubmit,
        policy: claim.policy,
        policyAlias: '',
        forceCcode: false,
        forcePolicy: false,
        serviceDate: claim.serviceDate,
        receiptDate: claim.dateOfReceipt,
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        statusCode: '',
        lockedByUser: userName,
        eligMemberId: 0,
        ccodeRecId: 0,
      })
      .then(() => {
        showSnackbar('CCode updated successfully.', 'success');
        onAction('updateCCode');
      })
      .catch(() =>
        showSnackbar('Failed to update CCode. Please try again.', 'error')
      )
      .finally(() => setActionLoading(null));
  };

  // ── Pend dialog ────────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
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
            onUpdateCcodeClick={handleUpdateCcodeClick}
            onPendClick={handlePendClick}
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
