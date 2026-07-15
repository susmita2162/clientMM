// src/components/UpdateCcodeDialogs.tsx
//
// Confirmation dialogs and inline banner for the Update CCode flow.
//
// Three scenarios from the real API (confirmed from Postman):
//
//   1. status.statusCode === 'P', validation.invalid === 'ccodeNotEffective'
//      → CcodeNotEffectiveDialog (Yes/No)
//        Yes → re-submit with forceCcode: true
//
//   2. status.statusCode === 'P', validation.invalid === 'policy'
//      → InvalidPolicyDialog (Yes/No)
//        Yes → re-submit with forcePolicy: true
//
//   3. status.statusCode === 'A', validation.invalid === 'ccodeNotFound'
//      → CcodeNotFoundBanner (inline on dashboard — no override possible)
//        Buttons: Retry (re-open UpdateCcodeDialog) | Return to Dashboard
//
// MrMatchTypeDialog is shown BEFORE the API call when the selected employer
// group record has matchType 'MR'. Yes → submit with forceCcode: true.
//
// All API-facing message text comes from the response — never hardcoded.

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';
import {
  WarningAmberRounded as WarningAmberRoundedIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@mui/icons-material';

// ── Shared warning icon ───────────────────────────────────────────────────────

function DialogWarningIcon() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        bgcolor: 'rgba(237, 108, 2, 0.12)',
        flexShrink: 0,
      }}
    >
      <WarningAmberRoundedIcon sx={{ color: 'warning.dark', fontSize: 22 }} />
    </Box>
  );
}

// ── Shared dialog shell ───────────────────────────────────────────────────────

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly titleId: string;
  readonly title: string;
  readonly message: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

function ConfirmDialog({
  open,
  titleId,
  title,
  message,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      slotProps={{
        paper: {
          elevation: 4,
          sx: { borderRadius: 2, minWidth: 380, maxWidth: 480 },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 3,
          pt: 2.5,
          pb: 1.5,
        }}
      >
        <DialogWarningIcon />
        <DialogTitle
          id={titleId}
          sx={{ p: 0, fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}
        >
          {title}
        </DialogTitle>
      </Box>
      <Divider />
      <DialogContent sx={{ px: 3, py: 2 }}>
        <DialogContentText sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button
          size='small'
          variant='contained'
          color='warning'
          autoFocus
          onClick={onConfirm}
        >
          Yes
        </Button>
        <Button size='small' variant='outlined' onClick={onClose}>
          No
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog 1 (pre-API): MR Match Type ────────────────────────────────────────
//
// Shown BEFORE the API call when the selected employer group has matchType 'MR'.
// Yes → caller submits with forceCcode: true.

interface MrMatchTypeDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export function MrMatchTypeDialog({
  open,
  onClose,
  onConfirm,
}: MrMatchTypeDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      titleId='mr-match-title'
      title='MR Match Type'
      message='Selected CCode requires match by enrollment, do you wish to proceed?'
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

// ── Dialog 2 (post-API): CCode Not Effective (statusCode 'P', invalid: 'ccodeNotEffective') ──
//
// Shown when API returns statusCode 'P' and validation.invalid === 'ccodeNotEffective'.
// Message text comes from API response (status.description) — do not hardcode.
// Yes → caller re-submits with forceCcode: true.

interface CcodeNotEffectiveDialogProps {
  readonly open: boolean;
  /** status.description from the API response. */
  readonly message: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export function CcodeNotEffectiveDialog({
  open,
  message,
  onClose,
  onConfirm,
}: CcodeNotEffectiveDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      titleId='ccode-not-effective-title'
      title='CCode Not Effective'
      message={message}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

// ── Dialog 3 (post-API): Invalid Policy (statusCode 'P', invalid: 'policy') ─
//
// Shown when API returns statusCode 'P' and validation.invalid === 'policy'.
// Message text comes from API response (status.description) — do not hardcode.
// Yes → caller re-submits with forcePolicy: true.

interface InvalidPolicyDialogProps {
  readonly open: boolean;
  /** status.description from the API response. */
  readonly message: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export function InvalidPolicyDialog({
  open,
  message,
  onClose,
  onConfirm,
}: InvalidPolicyDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      titleId='invalid-policy-title'
      title='Invalid Policy'
      message={message}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

// ── Inline banner: CCode Not Found (statusCode 'A', invalid: 'ccodeNotFound') ─
//
// Shown inline on the dashboard (not a dialog) when the API returns
// statusCode 'A'. canOverride is false — no Yes/No override is possible.
// Message text comes from API response (status.description).
// Retry → re-opens UpdateCcodeDialog so the user can enter a different ccode.
// Return to Dashboard → navigates back to ManualReviewDashboard.

interface CcodeNotFoundBannerProps {
  /** status.description from the API response. */
  readonly message: string;
  readonly onRetry: () => void;
  readonly onReturnToDashboard: () => void;
}

export function CcodeNotFoundBanner({
  message,
  onRetry,
  onReturnToDashboard,
}: CcodeNotFoundBannerProps) {
  return (
    <Alert
      severity='error'
      icon={<ErrorOutlineIcon fontSize='inherit' />}
      sx={{ mb: 2, alignItems: 'flex-start' }}
    >
      <Box>
        <Typography
          variant='subtitle2'
          fontWeight={700}
          gutterBottom
          sx={{ fontSize: '0.875rem' }}
        >
          CCode Not Found
        </Typography>
        <Typography variant='body2' sx={{ mb: 1.5, lineHeight: 1.6 }}>
          {message}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size='small'
            variant='contained'
            color='error'
            onClick={onRetry}
          >
            Retry
          </Button>
          <Button
            size='small'
            variant='outlined'
            color='error'
            onClick={onReturnToDashboard}
          >
            Return to Dashboard
          </Button>
        </Box>
      </Box>
    </Alert>
  );
}

// ── Legacy export alias (keeps ClaimActionBar imports compiling) ──────────────
//
// ClaimActionBar imports InvalidCcodeDialog by name. Alias it to the renamed
// CcodeNotEffectiveDialog so that file doesn't need a simultaneous change.
// Remove this alias once ClaimActionBar is updated to use the new name.

export const InvalidCcodeDialog = CcodeNotEffectiveDialog;
