// src/components/PendDialog.tsx
// Pend / Pend Notes dialog.
// Owns only its own form state (pendNotes).
// API call logic lives in ClaimInformationPanel — received via onConfirm.
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

export type PendMode = 'pendClaim' | 'pendNotes';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: PendMode;
  claimNumber: string;
  anyLoading: boolean;
  isSubmitting: boolean;
  onConfirm: (notes: string) => void;
}

export default function PendDialog({
  open,
  onClose,
  mode,
  claimNumber,
  anyLoading,
  isSubmitting,
  onConfirm,
}: Props) {
  const [notes, setNotes] = useState('');

  // Reset notes when dialog opens
  const handleClose = () => {
    if (!anyLoading) {
      setNotes('');
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='xs'
      fullWidth
      PaperProps={{ elevation: 4, sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
        {mode === 'pendClaim' ? 'Pend Claim' : 'Pend Notes'}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Claim <strong>{claimNumber}</strong>
          {mode === 'pendClaim'
            ? ' will be pended. Add notes below (optional).'
            : ' — update pend notes below.'}
        </Typography>
        <TextField
          label='Pend Notes'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          fullWidth
          size='small'
          placeholder='Enter notes...'
          disabled={anyLoading}
        />
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={anyLoading}
          size='small'
          variant='outlined'
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
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
          {isSubmitting ? 'Submitting...' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
