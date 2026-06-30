// src/components/ClaimInformationPanel.tsx
// Thin orchestrator — owns actionLoading, snackbar, isPended state, and API calls.
//
// CHANGES (this iteration):
//
//   updateCCode response handling aligned to real API shape:
//
//   Old (wrong) shape assumed:
//     result.data.parameters.invalid === 'ccode' | 'policy'
//     result.data.message  (the description string)
//
//   Real API shape (confirmed from Postman, images 9/11/12):
//     result.data.validation.invalid === 'ccodeNotEffective' | 'policy' | 'ccodeNotFound'
//     result.data.status.description  (the description string)
//     result.data.status.statusCode   === 'P' (overridable) | 'A' (hard fail)
//
//   Three result branches:
//     invalid === 'ccodeNotEffective' → CcodeNotEffectiveDialog (Yes → forceCcode: true)
//     invalid === 'policy'            → InvalidPolicyDialog (Yes → forcePolicy: true)
//     invalid === 'ccodeNotFound'     → onCcodeNotFound(description) — inline banner
//                                       on dashboard, no re-submission possible
//
//   onAction union extended to include 'resetClaim'.
//   onCcodeNotFound prop added — called for the ccodeNotFound hard-failure case.
//
// Previous change (retained):
//   pendNotes display — structured HaltedClaimApiPendNote[] shape support.

import { useState } from 'react';
import { Alert, Box, Button, Snackbar } from '@mui/material';
import {
  MrMatchTypeDialog,
  CcodeNotEffectiveDialog,
  InvalidPolicyDialog,
} from './UpdateCcodeDialogs';
import Collapsible from './shared/Collapsible';
import ClaimInfoGrid from './ClaimInfoGrid';
import ClaimActionBar from './ClaimActionBar';
import PendDialog, { type PendMode } from './PendDialog';
import { claimsApi } from '../services/claimsApi';
import { ApiServiceError, getErrorMessage } from '../types/errorTypes';
import type { HaltedClaim, HaltedClaimApiPendNote } from '../types/claims';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  readonly claim: HaltedClaim;
  readonly onAction: (
    action:
      | 'updateCCode'
      | 'pendClaim'
      | 'pendNotes'
      | 'denyClaim'
      | 'resetClaim'
  ) => void;
  /**
   * Called when updateCCode returns statusCode 'A' (invalid: ccodeNotFound).
   * The dashboard renders an inline CcodeNotFoundBanner with this message.
   * No dialog — canOverride is false, no re-submission is possible.
   */
  readonly onCcodeNotFound?: (message: string) => void;
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
   * When 'MR', MrMatchTypeDialog is shown before the API call.
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

const resolveErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err instanceof ApiServiceError) {
    return getErrorMessage(err);
  }
  return defaultMessage;
};

/**
 * Type guard — returns true when the note is the structured shape
 * (HaltedClaimApiPendNote) returned by the updated nextHalted API.
 */
const isStructuredNote = (
  note: HaltedClaimApiPendNote | Record<string, string>
): note is HaltedClaimApiPendNote => {
  return 'noteText' in note;
};

/**
 * Formats pendNotes for display in the PendDialog read-only upper section.
 *
 * New nextHalted shape:  HaltedClaimApiPendNote[] → "noteText  (creationDate, createdBy)"
 * Legacy findByClaimId:  Record<string,string>[] → all values joined (unchanged behaviour)
 */
const formatPendNotes = (
  notes: HaltedClaimApiPendNote[] | Record<string, string>[] | undefined
): string => {
  if (!notes || notes.length === 0) return '';

  return notes
    .map((note) => {
      if (isStructuredNote(note)) {
        // New shape: surface noteText prominently; append metadata on same line.
        const meta = [note.creationDate, note.createdBy]
          .filter(Boolean)
          .join(', ');
        return meta ? `${note.noteText}  (${meta})` : note.noteText;
      }
      // Legacy shape: join all values as before.
      return Object.values(note).filter(Boolean).join(' ');
    })
    .join('\n');
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClaimInformationPanel({
  claim,
  onAction,
  onCcodeNotFound,
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

  // Dialog 1 (pre-API): MR Match Type.
  // Shown when selectedMatchType === 'MR'. Yes → forceCcode: true.
  const [mrMatchDialogOpen, setMrMatchDialogOpen] = useState(false);

  // Dialog 2a (post-API): CCode Not Effective.
  // Shown when validation.invalid === 'ccodeNotEffective' (statusCode 'P').
  // Yes → re-submit with forceCcode: true.
  const [ccodeNotEffectiveDialog, setCcodeNotEffectiveDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  // Dialog 2b (post-API): Invalid Policy.
  // Shown when validation.invalid === 'policy' (statusCode 'P').
  // Yes → re-submit with forcePolicy: true.
  const [invalidPolicyDialog, setInvalidPolicyDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  // Reset all transient dialog and pend state when the claim changes (queue advance).
  if (prevClaimNumber !== claim.claimNumber) {
    setPrevClaimNumber(claim.claimNumber);
    setIsPended(claim.pendedClaim === 'Y');
    setMrMatchDialogOpen(false);
    setCcodeNotEffectiveDialog({ open: false, message: '' });
    setInvalidPolicyDialog({ open: false, message: '' });
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Persistent error alert — disables all buttons until dismissed.
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
   * Core submit — builds the request and fires POST /updateCcode.
   *
   * forceCcode and forcePolicy are always false on the first call.
   * They are set to true on re-submission from the override dialogs:
   *   ccodeNotEffective → forceCcode: true
   *   policy invalid    → forcePolicy: true
   *
   * Result branches (keyed on real API shape):
   *   statusCode 'C'                         → success → snackbar + onAction('updateCCode')
   *   statusCode 'P', invalid 'ccodeNotEffective' → CcodeNotEffectiveDialog (Yes/No)
   *   statusCode 'P', invalid 'policy'           → InvalidPolicyDialog (Yes/No)
   *   statusCode 'A', invalid 'ccodeNotFound'    → onCcodeNotFound(description) — inline banner
   *   any other invalid value                    → surface as actionError (do not swallow)
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
        if (result.type === 'success') {
          // statusCode 'C' — "Claim validated and locked successfully."
          showSuccess('CCode updated successfully.');
          onAction('updateCCode');
          return;
        }

        // result.type === 'alert' — real API shape: result.data.validation.invalid
        const invalid = result.data.validation?.invalid;
        const description = result.data.status.description;

        if (invalid === 'ccodeNotEffective') {
          // statusCode 'P', canOverride: true → Yes/No → re-submit with forceCcode: true
          setCcodeNotEffectiveDialog({ open: true, message: description });
          return;
        }

        if (invalid === 'policy') {
          // statusCode 'P' → Yes/No → re-submit with forcePolicy: true
          setInvalidPolicyDialog({ open: true, message: description });
          return;
        }

        if (invalid === 'ccodeNotFound') {
          // statusCode 'A', canOverride: false → inline banner on dashboard
          onCcodeNotFound?.(description);
          return;
        }

        // Unknown invalid field — surface as error, do not swallow.
        setActionError(
          description || 'CCode update was not accepted. Please try again.'
        );
      })
      .catch((err: unknown) =>
        setActionError(
          resolveErrorMessage(err, 'Failed to update CCode. Please try again.')
        )
      )
      .finally(() => setActionLoading(null));
  };

  /**
   * "Update CCode" button click handler.
   * MR interception: show MrMatchTypeDialog first when selectedMatchType === 'MR'.
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

  // Format pendNotes for the PendDialog read-only upper section.
  // Handles both new structured shape (HaltedClaimApiPendNote[]) and
  // legacy Record<string,string>[] from findByClaimId — no regression.
  const existingNotesDisplay = formatPendNotes(claim.pendNotes);

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

      {/* Dialog 1 — MR Match Type (pre-API)
          Shown when selectedMatchType === 'MR'. Yes → forceCcode: true. */}
      <MrMatchTypeDialog
        open={mrMatchDialogOpen}
        onClose={() => setMrMatchDialogOpen(false)}
        onConfirm={() => {
          setMrMatchDialogOpen(false);
          submitUpdateCcode(true, false);
        }}
      />

      {/* Dialog 2a — CCode Not Effective (post-API, statusCode 'P', invalid 'ccodeNotEffective')
          Message text from API response. Yes → re-submit with forceCcode: true. */}
      <CcodeNotEffectiveDialog
        open={ccodeNotEffectiveDialog.open}
        message={ccodeNotEffectiveDialog.message}
        onClose={() =>
          setCcodeNotEffectiveDialog((s) => ({ ...s, open: false }))
        }
        onConfirm={() => {
          setCcodeNotEffectiveDialog({ open: false, message: '' });
          submitUpdateCcode(true, false);
        }}
      />

      {/* Dialog 2b — Invalid Policy (post-API, statusCode 'P', invalid 'policy')
          Message text from API response. Yes → re-submit with forcePolicy: true. */}
      <InvalidPolicyDialog
        open={invalidPolicyDialog.open}
        message={invalidPolicyDialog.message}
        onClose={() => setInvalidPolicyDialog((s) => ({ ...s, open: false }))}
        onConfirm={() => {
          setInvalidPolicyDialog({ open: false, message: '' });
          submitUpdateCcode(false, true);
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
