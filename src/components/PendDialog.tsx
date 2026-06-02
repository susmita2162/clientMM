// src/components/PendDialog.tsx
// Pend / Pend Notes dialog.
//
// Layout matches legacy UI (image 8):
//   - Upper scrollable area: existing pend notes (read-only, empty until API provides them)
//   - Lower area: "New Pend Note" textarea for entering new notes
//   - Save / Cancel buttons
//
// Modes:
//   pendClaim  — title "Pend Claim",  submits pended:true
//   pendNotes  — title "Pend Notes",  submits pended:false (update notes only)
//
// API call logic lives in ClaimInformationPanel — received via onConfirm.

import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material';

export type PendMode = 'pendClaim' | 'pendNotes';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly mode: PendMode;
  readonly claimNumber: string;
  /**
   * Existing pend notes to display in the read-only upper section.
   * Passed from ClaimInformationPanel — sourced from claim.pendNotes
   * returned by both nextHalted and findByClaimId API responses.
   */
  readonly existingNotes?: string;
  readonly anyLoading: boolean;
  readonly isSubmitting: boolean;
  readonly onConfirm: (notes: string) => void;
}

export default function PendDialog({
  open,
  onClose,
  mode,
  claimNumber,
  existingNotes = '',
  anyLoading,
  isSubmitting,
  onConfirm,
}: Props) {
  const [newNote, setNewNote] = useState('');

  const handleClose = () => {
    if (!anyLoading) {
      setNewNote('');
      onClose();
    }
  };

  const handleSave = () => {
    onConfirm(newNote);
    setNewNote('');
  };

  const title = mode === 'pendClaim' ? 'Pend Claim' : 'Pend Notes';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      slotProps={{ paper: { elevation: 4, sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
        {title}
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ display: 'block', fontWeight: 400, mt: 0.25 }}
        >
          Claim: {claimNumber}
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {/*
          Upper section — existing / historical pend notes (read-only).
          Matches the upper blank area in image 8.
          Height is fixed so the layout is stable regardless of content.
        */}
        <Box
          sx={{
            minHeight: 120,
            maxHeight: 200,
            overflowY: 'auto',
            px: 2,
            py: 1.5,
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {existingNotes ? (
            <Typography
              variant='body2'
              sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}
            >
              {existingNotes}
            </Typography>
          ) : (
            <Typography
              variant='body2'
              color='text.disabled'
              fontStyle='italic'
            >
              No existing pend notes.
            </Typography>
          )}
        </Box>

        {/* Lower section — new pend note input */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography
            variant='body2'
            fontWeight={600}
            color='text.secondary'
            sx={{
              mb: 0.75,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.4px',
            }}
          >
            New Pend Note:
          </Typography>
          <TextField
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            multiline
            rows={4}
            fullWidth
            size='small'
            placeholder='Enter note...'
            disabled={anyLoading}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 1 },
            }}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2, py: 1.25, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={anyLoading}
          size='small'
          variant='outlined'
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={anyLoading}
          size='small'
          variant='contained'
          color='warning'
          startIcon={
            isSubmitting ? (
              <CircularProgress size={12} color='inherit' />
            ) : undefined
          }
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
