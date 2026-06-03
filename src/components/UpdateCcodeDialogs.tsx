// src/components/UpdateCcodeDialogs.tsx
// Confirmation dialogs for the Update CCode flow.
//
// MrMatchTypeDialog  — Dialog 1: shown BEFORE the API call when the selected
//                      employer group record has matchType 'MR'.
//                      Yes → caller re-submits with forceCcode: true.
//
// InvalidCcodeDialog — Dialog 2: shown AFTER API returns HTTP 200 with
//                      status: 'ALERT', parameters.invalid === 'ccode'.
//                      Message text is passed in from the API response — not hardcoded.
//                      Yes → caller re-submits with forceCcode: true.
//
// DialogWarningIcon is a module-private helper shared by both dialogs.
// Both dialogs follow the same visual pattern as the existing deny validation
// dialog in ClaimActionBar: warning icon · title / divider / body / divider / No + Yes.

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

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

// ── Dialog 1: MR Match Type ───────────────────────────────────────────────────

interface MrMatchTypeDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Called when user clicks Yes — caller should re-submit with forceCcode: true. */
  readonly onConfirm: () => void;
}

export function MrMatchTypeDialog({
  open,
  onClose,
  onConfirm,
}: MrMatchTypeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby='mr-match-title'
      slotProps={{
        paper: {
          elevation: 4,
          sx: { borderRadius: 2, minWidth: 380, maxWidth: 440 },
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
          id='mr-match-title'
          sx={{ p: 0, fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}
        >
          MR Match Type
        </DialogTitle>
      </Box>
      <Divider />
      <DialogContent sx={{ px: 3, py: 2 }}>
        <DialogContentText sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
          Selected CCode requires match by enrollment, do you wish to proceed?
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

// ── Dialog 2: Invalid CCode (ALERT response) ──────────────────────────────────

interface InvalidCcodeDialogProps {
  readonly open: boolean;
  /** Message from the API response — do not hardcode. */
  readonly message: string;
  readonly onClose: () => void;
  /** Called when user clicks Yes — caller should re-submit with forceCcode: true. */
  readonly onConfirm: () => void;
}

export function InvalidCcodeDialog({
  open,
  message,
  onClose,
  onConfirm,
}: InvalidCcodeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby='invalid-ccode-title'
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
          id='invalid-ccode-title'
          sx={{ p: 0, fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}
        >
          Invalid Entry
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
