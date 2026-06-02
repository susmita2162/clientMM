// src/components/ClaimInformationPanel.tsx
// Thin orchestrator — owns actionLoading, snackbar, isPended state, and API calls.
//
// CHANGES:
//
//   Fix 1 — eligMemberId / serviceDate from Member Search MFE:
//     • New props: selectedEligMemberId, selectedMemberServiceDate.
//     • handleUpdateCcodeClick uses these in the UpdateCcode payload instead
//       of the hardcoded 0 and claim.serviceDate.
//     • Fallbacks: eligMemberId → 0, serviceDate → claim.serviceDate when
//       no member has been selected in the MFE.
//
//   Fix 2 — userName = 'system' (already correct, no change):
//     • userName defaults to 'system'. Used as lockedByUser (updateCcode),
//       userName (pend, deny). Will be replaced with auth context value
//       when auth is integrated.
//
//   Fix 3 — Graceful exits after action errors:
//     • actionError state replaces snackbar for error cases.
//     • On any API error: dialogs are closed and actionError is set.
//     • While actionError is set: all action buttons are disabled
//       (anyLoading includes actionError !== null).
//     • Persistent inline Alert shows the error with two options:
//         "Dismiss"              — clears actionError, re-enables buttons.
//         "Return to Dashboard"  — calls onNavigateBack (new prop).
//     • Snackbar is now success-only.
//
// isPended flow (unchanged):
//   pendedClaim 'N' → false → Pend Claim enabled, Pend Notes disabled.
//   API success     → true  → Pend Claim disabled, Pend Notes enabled.

import { useState } from 'react';
import { Alert, Box, Button, Snackbar } from '@mui/material';
import Collapsible from './shared/Collapsible';
import ClaimInfoGrid from './ClaimInfoGrid';
import ClaimActionBar from './ClaimActionBar';
import PendDialog, { type PendMode } from './PendDialog';
import { claimsApi } from '../services/claimsApi';
import { ApiServiceError, getErrorMessage } from '../types/errorTypes';
import type { HaltedClaim } from '../types/claims';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  readonly claim: HaltedClaim;
  readonly onAction: (
    action: 'updateCCode' | 'pendClaim' | 'pendNotes' | 'denyClaim'
  ) => void;
  /**
   * CCode selected in a MFE panel.
   * Two roles:
   *   1. Forwarded to ClaimInfoGrid → "Client Code" field updates live.
   *   2. Used as the ccode payload in the Update CCode POST.
   *      Falls back to claim.ccode when absent.
   */
  readonly selectedCcode?: string;
  /**
   * [Fix 1] eligMemberId from Member Search MFE (MemberRecord.id as Number).
   * Sent as UpdateCcodeRequest.eligMemberId. Defaults to 0 when no member
   * has been selected in the panel.
   */
  readonly selectedEligMemberId?: number;
  /**
   * [Fix 1] serviceDate from Member Search MFE (MemberRecord.effectiveDate).
   * Sent as UpdateCcodeRequest.serviceDate.
   * Falls back to claim.serviceDate when absent.
   */
  readonly selectedMemberServiceDate?: string;
  /**
   * [Fix 3] Called when the user clicks "Return to Dashboard" in the
   * post-error Alert. Wired to navigate('/manual-review') by the parent.
   */
  readonly onNavigateBack?: () => void;
  /** Defaults to 'system'. Replace with auth context value when available. */
  readonly userName?: string;
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
  selectedEligMemberId,
  selectedMemberServiceDate,
  onNavigateBack,
  userName = 'system',
}: Props) {
  // ── Pend state ─────────────────────────────────────────────────────────────
  // prevClaimNumber tracks the last rendered claim so we can detect a claim
  // change during render (queue advance) and reset isPended synchronously.
  // This is the React-recommended pattern for resetting state on prop change:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevClaimNumber, setPrevClaimNumber] = useState(claim.claimNumber);
  const [isPended, setIsPended] = useState(claim.pendedClaim === 'Y');

  if (prevClaimNumber !== claim.claimNumber) {
    setPrevClaimNumber(claim.claimNumber);
    setIsPended(claim.pendedClaim === 'Y');
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── [Fix 3] Action error ───────────────────────────────────────────────────
  // Set on any API error. While set, all action buttons are disabled and a
  // persistent Alert is shown with Dismiss / Return to Dashboard options.
  const [actionError, setActionError] = useState<string | null>(null);

  // Buttons are disabled during loading OR while an unacknowledged error is shown.
  const anyLoading = actionLoading !== null || actionError !== null;

  // ── Snackbar (success only) ────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const showSuccess = (message: string) => setSnackbar({ open: true, message });

  // ── Update CCode ───────────────────────────────────────────────────────────
  // Fix 1: eligMemberId ← selectedEligMemberId ?? 0
  //        serviceDate  ← selectedMemberServiceDate || claim.serviceDate
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
        serviceDate: selectedMemberServiceDate || claim.serviceDate,
        receiptDate: claim.dateOfReceipt,
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        statusCode: '',
        lockedByUser: userName,
        eligMemberId: selectedEligMemberId ?? 0,
        ccodeRecId: 0,
      })
      .then(() => {
        showSuccess('CCode updated successfully.');
        onAction('updateCCode');
      })
      .catch((err: unknown) =>
        // Fix 3: set persistent error — do not re-enable buttons automatically.
        setActionError(
          resolveErrorMessage(err, 'Failed to update CCode. Please try again.')
        )
      )
      .finally(() => setActionLoading(null));
  };

  // ── Pend dialog ────────────────────────────────────────────────────────────
  const [pendOpen, setPendOpen] = useState(false);
  const [pendMode, setPendMode] = useState<PendMode>('pendClaim');

  // Convert pendNotes array<object> → display string for PendDialog upper section.
  // Each note object has string-keyed string values (per swagger "Additional properties: string").
  // Object.values joins all values in a note; notes are separated by newlines.
  // Note: once the exact key names (e.g. date, userName, noteText) are confirmed
  // from a live response, replace Object.values with explicit key access for
  // controlled ordering: `${note.date} - ${note.userName}: ${note.noteText}`
  const existingNotesDisplay = (claim.pendNotes ?? [])
    .map((note) => Object.values(note).join(' '))
    .join('\n');

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
        if (pendMode === 'pendClaim') setIsPended(true);
        showSuccess('Claim pended successfully.');
        onAction(pendMode);
      })
      .catch((err: unknown) => {
        // Fix 3: close dialog so user cannot retry from inside it.
        setPendOpen(false);
        setActionError(
          resolveErrorMessage(err, 'Failed to pend claim. Please try again.')
        );
      })
      .finally(() => setActionLoading(null));
  };

  // ── Deny ───────────────────────────────────────────────────────────────────
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
        showSuccess('Claim denied successfully.');
        onAction('denyClaim');
      })
      .catch((err: unknown) =>
        // Fix 3: set persistent error.
        setActionError(
          resolveErrorMessage(err, 'Failed to deny claim. Please try again.')
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
            [Fix 3] Persistent error alert — shown after any action failure.
            Buttons remain disabled until user explicitly dismisses or exits.
          */}
          {actionError && (
            <Alert
              severity='error'
              sx={{ mb: 1.5 }}
              action={
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Button
                    size='small'
                    color='inherit'
                    onClick={() => setActionError(null)}
                  >
                    Dismiss
                  </Button>
                  {onNavigateBack && (
                    <Button
                      size='small'
                      color='inherit'
                      variant='outlined'
                      onClick={onNavigateBack}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Return to Dashboard
                    </Button>
                  )}
                </Box>
              }
            >
              {actionError}
            </Alert>
          )}

          <ClaimInfoGrid claim={claim} selectedCcode={selectedCcode} />

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
        existingNotes={existingNotesDisplay}
        anyLoading={anyLoading}
        isSubmitting={actionLoading === 'pend'}
        onConfirm={handlePendConfirm}
      />

      {/* Success-only snackbar — errors use the persistent Alert above. */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity='success'
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
