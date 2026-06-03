// src/components/ClaimInformationPanel.tsx
// Thin orchestrator — owns actionLoading, snackbar, isPended state, and API calls.
//
// CHANGES (this iteration):
//
//   Update CCode — Dialog 1 (MR Match Type):
//     • New prop: selectedMatchType.
//     • handleUpdateCcodeClick checks selectedMatchType === 'MR' before firing
//       the API. If matched, shows mrMatchDialog asking for enrollment confirmation.
//       Yes → submitUpdateCcode(forceCcode: true).
//       No  → closes dialog, no action.
//
//   Update CCode — Dialog 2 (Invalid CCode / ALERT response):
//     • claimsApi.updateCcode now returns UpdateCcodeResult (discriminated union).
//     • submitUpdateCcode inspects result.type === 'alert' + parameters.invalid === 'ccode'
//       and shows invalidCcodeDialog with the API-supplied message.
//       Yes → submitUpdateCcode(forceCcode: true).
//       No  → closes dialog, no action.
//     • Other ALERT types (e.g. invalid policy) surface as actionError — do not
//       silently fall through to success.
//
//   submitUpdateCcode(forceCcode: boolean):
//     • Extracted from handleUpdateCcodeClick so the same API call can be
//       re-issued by both dialog confirmations with forceCcode: true.
//
//   Dialog state reset on claim change:
//     • mrMatchDialogOpen and invalidCcodeDialog are reset in the same
//       prevClaimNumber guard that resets isPended — prevents stale dialogs
//       appearing on queue advance.
//
// All other logic is unchanged from the previous iteration.

import { useState } from 'react';
import { Alert, Box, Button, Snackbar } from '@mui/material';
import { MrMatchTypeDialog, InvalidCcodeDialog } from './UpdateCcodeDialogs';
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
   * Forwarded to ClaimInfoGrid (live "Client Code" display) and used as the
   * ccode payload in the Update CCode POST. Falls back to claim.ccode.
   */
  readonly selectedCcode?: string;
  /**
   * eligMemberId from Member Search MFE (MemberRecord.id as Number).
   * Sent as UpdateCcodeRequest.eligMemberId. Defaults to 0 when absent.
   */
  readonly selectedEligMemberId?: number;
  /**
   * serviceDate from Member Search MFE (MemberRecord.effectiveDate).
   * Sent as UpdateCcodeRequest.serviceDate. Falls back to claim.serviceDate.
   */
  readonly selectedMemberServiceDate?: string;
  /**
   * matchType of the ClientRecord selected in Employer Group Search.
   * When 'MR', Dialog 1 (MR Match Type) is shown before the API call.
   * Sourced from EmployerGroupSearchPanel → ClientManualMatchDashboard.
   */
  readonly selectedMatchType?: string;
  /**
   * Called when user clicks "Return to Dashboard" in the post-error Alert.
   * Wired to navigate('/manual-review') by the parent.
   */
  readonly onNavigateBack?: () => void;
  /** Defaults to 'system'. Replace with auth context value when available. */
  readonly userName?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  selectedMatchType,
  onNavigateBack,
  userName = 'system',
}: Props) {
  // ── Pend state ─────────────────────────────────────────────────────────────
  // prevClaimNumber detects a claim change during render (queue advance) so
  // isPended and any open dialogs can be reset synchronously.
  // React-recommended pattern:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevClaimNumber, setPrevClaimNumber] = useState(claim.claimNumber);
  const [isPended, setIsPended] = useState(claim.pendedClaim === 'Y');

  // ── Update CCode dialog state ──────────────────────────────────────────────

  // Dialog 1: MR Match Type — shown BEFORE the API call when the selected
  // employer group record has matchType 'MR'.
  const [mrMatchDialogOpen, setMrMatchDialogOpen] = useState(false);

  // Dialog 2: Invalid field — shown AFTER API returns status: 'ALERT' with
  // parameters.invalid === 'ccode' or 'policy'. Message from the API response.
  // forceField drives which flag is set to true on confirm.
  const [invalidCcodeDialog, setInvalidCcodeDialog] = useState<{
    open: boolean;
    message: string;
    forceField: 'ccode' | 'policy';
  }>({ open: false, message: '', forceField: 'ccode' });

  // Reset all transient dialog and pend state when the claim changes.
  // Called during render — React will immediately re-render with new state.
  if (prevClaimNumber !== claim.claimNumber) {
    setPrevClaimNumber(claim.claimNumber);
    setIsPended(claim.pendedClaim === 'Y');
    setMrMatchDialogOpen(false);
    setInvalidCcodeDialog({ open: false, message: '', forceField: 'ccode' });
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Action error ───────────────────────────────────────────────────────────
  // Set on any API error. Disables all action buttons until explicitly dismissed.
  const [actionError, setActionError] = useState<string | null>(null);

  // Buttons are disabled during an in-flight action OR while an unacknowledged
  // error is showing. Dialogs being open does not block buttons — they are modal.
  const anyLoading = actionLoading !== null || actionError !== null;

  // ── Snackbar (success only) ────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const showSuccess = (message: string) => setSnackbar({ open: true, message });

  // ── Update CCode ───────────────────────────────────────────────────────────

  /**
   * Core submit function — builds payload and fires the API.
   *
   * Called in three ways:
   *   submitUpdateCcode(false, false)  — normal flow
   *   submitUpdateCcode(true,  false)  — after Dialog 1 (MR) or Dialog 2 (invalid ccode) confirm
   *   submitUpdateCcode(false, true)   — after Dialog 2 (invalid policy) confirm
   *
   * Result handling:
   *   type 'success'                             → snackbar + onAction
   *   type 'alert', invalid === 'ccode'          → show Dialog 2, forceField: 'ccode'
   *   type 'alert', invalid === 'policy'         → show Dialog 2, forceField: 'policy'
   *   type 'alert', other invalid field          → surface as actionError (do not swallow)
   */
  const submitUpdateCcode = (forceCcode: boolean, forcePolicy: boolean) => {
    setActionLoading('updateCcode');
    claimsApi
      .updateCcode({
        ccode: selectedCcode || claim.ccode,
        policy: claim.policy,
        policyAlias: '',
        forceCcode,
        forcePolicy,
        serviceDate: selectedMemberServiceDate || claim.serviceDate,
        receiptDate: claim.dateOfReceipt,
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        statusCode: '',
        lockedByUser: userName,
        eligMemberId: selectedEligMemberId ?? 0,
        ccodeRecId: 0,
      })
      .then((result) => {
        if (result.type === 'alert') {
          const { invalid } = result.data.parameters;
          if (invalid === 'ccode' || invalid === 'policy') {
            setInvalidCcodeDialog({
              open: true,
              message: result.data.message,
              forceField: invalid,
            });
          } else {
            // Unknown ALERT field — surface as error, do not swallow.
            setActionError(
              result.data.message ||
                'CCode update was not accepted. Please try again.'
            );
          }
          return;
        }
        showSuccess('CCode updated successfully.');
        onAction('updateCCode');
      })
      .catch((err: unknown) =>
        setActionError(
          resolveErrorMessage(err, 'Failed to update CCode. Please try again.')
        )
      )
      .finally(() => setActionLoading(null));
  };

  /**
   * "Update CCode" button handler.
   *
   * Dialog 1 interception: when the employer group record selected by the user
   * has matchType 'MR', show the enrollment confirmation dialog first.
   * Normal path: submit directly with both force flags false.
   */
  const handleUpdateCcodeClick = () => {
    if (selectedMatchType === 'MR') {
      setMrMatchDialogOpen(true);
      return;
    }
    submitUpdateCcode(false, false);
  };

  // ── Pend dialog ────────────────────────────────────────────────────────────
  const [pendOpen, setPendOpen] = useState(false);
  const [pendMode, setPendMode] = useState<PendMode>('pendClaim');

  // pendNotes array<object> → display string for PendDialog upper section.
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
        // Close dialog so user cannot retry from inside it.
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
          {/* Persistent error alert — shown after any action failure.
              All buttons remain disabled until user dismisses or navigates away. */}
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

      {/* Dialog 1 — MR Match Type
          Shown before the API call when the selected employer group record
          has matchType 'MR'. Yes → forceCcode: true. */}
      <MrMatchTypeDialog
        open={mrMatchDialogOpen}
        onClose={() => setMrMatchDialogOpen(false)}
        onConfirm={() => {
          setMrMatchDialogOpen(false);
          submitUpdateCcode(true, false);
        }}
      />

      {/* Dialog 2 — Invalid field (ALERT response)
          Shown after API returns status: 'ALERT' with invalid: 'ccode' or 'policy'.
          Message text comes from the API response.
          Yes → re-submit with the relevant force flag set to true. */}
      <InvalidCcodeDialog
        open={invalidCcodeDialog.open}
        message={invalidCcodeDialog.message}
        onClose={() => setInvalidCcodeDialog((s) => ({ ...s, open: false }))}
        onConfirm={() => {
          const { forceField } = invalidCcodeDialog;
          setInvalidCcodeDialog((s) => ({ ...s, open: false }));
          submitUpdateCcode(forceField === 'ccode', forceField === 'policy');
        }}
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
