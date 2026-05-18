// src/components/UpdateCcodeDialog.tsx
// UpdateCcode dialog.
//
// CHANGE: externalCcode prop — when the user selects a member or employer
// group in a MFE panel, the host passes the chosen ccode here.
// Priority order for the initial ccode value:
//   1. externalCcode (from MFE selection) — highest priority
//   2. claim.ccode (from loaded claim data)
//   3. '' (empty string fallback)
//
// The dialog remounts on every open (parent uses key={claimNumber} when open)
// so state always reflects the latest externalCcode without a useEffect.

import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import type { HaltedClaim } from '../types/claims';

export interface UpdateCcodeForm {
  ccode: string;
  policy: string;
  policyAlias: string;
  forceCcode: boolean;
  forcePolicy: boolean;
  eligMemberId: number; // int64 per swagger
  ccodeRecId: number; // int64 per swagger
}

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly claim: HaltedClaim;
  readonly anyLoading: boolean;
  readonly isSubmitting: boolean;
  /**
   * CCode pre-selected in Member Search or Employer Group Search MFE.
   * When provided, takes priority over claim.ccode for the initial form value.
   */
  readonly externalCcode?: string;
  readonly onConfirm: (form: UpdateCcodeForm) => void;
}

const defaultForm = (): UpdateCcodeForm => ({
  ccode: '',
  policy: '',
  policyAlias: '',
  forceCcode: false,
  forcePolicy: false,
  eligMemberId: 0,
  ccodeRecId: 0,
});

export default function UpdateCcodeDialog({
  open,
  onClose,
  claim,
  anyLoading,
  isSubmitting,
  externalCcode,
  onConfirm,
}: Props) {
  // Initialise form on mount (parent remounts via key on each open).
  // externalCcode takes priority over claim.ccode for the CCode field.
  const [form, setForm] = useState<UpdateCcodeForm>(() => ({
    ...defaultForm(),
    ccode: externalCcode ?? claim.ccode ?? '',
    policy: claim.policy ?? '',
  }));

  const set = <K extends keyof UpdateCcodeForm>(
    key: K,
    value: UpdateCcodeForm[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!anyLoading) onClose();
      }}
      maxWidth='xs'
      fullWidth
      slotProps={{ paper: { elevation: 4, sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
        Update CCode
      </DialogTitle>
      <Divider />
      <DialogContent
        sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <TextField
          label='CCode'
          value={form.ccode}
          onChange={(e) => set('ccode', e.target.value)}
          size='small'
          fullWidth
          disabled={anyLoading}
          helperText={
            externalCcode ? 'Pre-filled from MFE selection' : undefined
          }
        />
        <TextField
          label='Policy'
          value={form.policy}
          onChange={(e) => set('policy', e.target.value)}
          size='small'
          fullWidth
          disabled={anyLoading}
        />
        <TextField
          label='Policy Alias'
          value={form.policyAlias}
          onChange={(e) => set('policyAlias', e.target.value)}
          size='small'
          fullWidth
          disabled={anyLoading}
        />
        <TextField
          label='Elig Member ID'
          type='number'
          value={form.eligMemberId}
          onChange={(e) => set('eligMemberId', Number(e.target.value))}
          size='small'
          fullWidth
          disabled={anyLoading}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <TextField
          label='CCode Rec ID'
          type='number'
          value={form.ccodeRecId}
          onChange={(e) => set('ccodeRecId', Number(e.target.value))}
          size='small'
          fullWidth
          disabled={anyLoading}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.forceCcode}
                onChange={(e) => set('forceCcode', e.target.checked)}
                disabled={anyLoading}
                size='small'
              />
            }
            label={<Typography variant='body2'>Force CCode</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.forcePolicy}
                onChange={(e) => set('forcePolicy', e.target.checked)}
                disabled={anyLoading}
                size='small'
              />
            }
            label={<Typography variant='body2'>Force Policy</Typography>}
          />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={anyLoading}
          size='small'
          variant='outlined'
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(form)}
          disabled={anyLoading}
          size='small'
          variant='contained'
          color='primary'
          startIcon={
            isSubmitting ? (
              <CircularProgress size={12} color='inherit' />
            ) : undefined
          }
        >
          {isSubmitting ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
