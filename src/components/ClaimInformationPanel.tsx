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
//
// Update CCode:
//   ccode value used: selectedCcode (from MFE) when available, else claim.ccode.
//   No dialog — direct POST.
//   selectedCcode is ALSO forwarded to ClaimInfoGrid so the Client Code field
//   reflects the pending selection in real-time before the user hits the button.

import { useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import Collapsible from './shared/Collapsible';
import ClaimInfoGrid from './ClaimInfoGrid';
import ClaimActionBar from './ClaimActionBar';
import PendDialog, { type PendMode } from './PendDialog';
import { claimsApi } from '../services/claimsApi';
import { ApiServiceError, getErrorMessage } from '../types/errorTypes';
import type { HaltedClaim } from '../types/claims';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  claim: HaltedClaim;
  onAction: (
    action: 'updateCCode' | 'pendClaim' | 'pendNotes' | 'denyClaim'
  ) => void;
  /**
   * CCode selected in a MFE panel (Member Search → ccode,
   * Employer Group Search → clientCode).
   *
   * Two roles:
   *   1. Forwarded to ClaimInfoGrid → "Client Code" field updates live.
   *   2. Used as the ccode payload in the Update CCode POST.
   *      Falls back to claim.ccode when absent.
   */
  selectedCcode?: string;
  /** Defaults to 'system'. Replace with auth context value when available. */
  userName?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts a user-friendly message from any thrown value.
 * ApiServiceError instances are handled via getErrorMessage; all other
 * thrown values fall back to the provided defaultMessage.
 */
function resolveErrorMessage(err: unknown, defaultMessage: string): string {
  if (err instanceof ApiServiceError) {
    return getErrorMessage(err);
  }
  return defaultMessage;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClaimInformationPanel({
  claim,
  onAction,
  selectedCcode,
  userName = 'system',
}: Props) {
  // ── Pend state ─────────────────────────────────────────────────────────────
  // Local so it updates immediately after a successful API call without a
  // re-fetch. Initialised from claim.pendedClaim on mount.
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

  // ── Update CCode ───────────────────────────────────────────────────────────
  // Uses selectedCcode when available; falls back to claim.ccode.
  // No dialog — direct POST.
  const handleUpdateCcodeClick = () => {
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
      .catch((err: unknown) =>
        showSnackbar(
          resolveErrorMessage(err, 'Failed to update CCode. Please try again.'),
          'error'
        )
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
        // pendClaim → isPended becomes true (Pend Claim disabled, Pend Notes enabled).
        // pendNotes → pend state unchanged (claim was already pended).
        if (pendMode === 'pendClaim') {
          setIsPended(true);
        }
        showSnackbar('Claim pended successfully.', 'success');
        onAction(pendMode);
      })
      .catch((err: unknown) =>
        showSnackbar(
          resolveErrorMessage(err, 'Failed to pend claim. Please try again.'),
          'error'
        )
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
      .catch((err: unknown) =>
        showSnackbar(
          resolveErrorMessage(err, 'Failed to deny claim. Please try again.'),
          'error'
        )
      )
      .finally(() => setActionLoading(null));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Collapsible title='Claim Information' defaultExpanded={true}>
        <Box sx={{ p: 1.5 }}>
          {/*
            selectedCcode is forwarded so ClaimInfoGrid can display the
            live-selected value in the "Client Code" field before the user
            commits it via Update CCode.
          */}
          <ClaimInfoGrid claim={claim} selectedCcode={selectedCcode} />
          {/* <Divider sx={{ my: 1 }} /> */}
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
