// src/components/shared/NotFoundDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface NotFoundDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly message?: string;
}

/**
 * NotFoundDialog Component
 * Displays error messages when claims are not found or cannot be accessed
 *
 * @param open - Controls dialog visibility
 * @param onClose - Callback when dialog is closed
 * @param title - Dialog title (default: "Halted Claim Not Found")
 * @param message - Error message to display
 */
export default function NotFoundDialog({
  open,
  onClose,
  title = 'Halted Claim Not Found',
  message = 'The specified claim was not found. Either it is not a halted claim, it is locked by another user, or it does not exist.',
}: NotFoundDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
        }}
      >
        <ErrorOutlineIcon color='error' sx={{ fontSize: 28 }} />
        <Typography variant='h6' component='span' fontWeight={600}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 1 }}>
          <Typography variant='body1' color='text.secondary'>
            {message}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant='contained'
          sx={{
            textTransform: 'uppercase',
            fontWeight: 600,
            px: 3,
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
