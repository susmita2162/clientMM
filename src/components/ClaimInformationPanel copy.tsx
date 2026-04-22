// src/components/ClaimInformationPanel.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  type SelectChangeEvent,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Collapsible from './shared/Collapsible';
import { claimsApi } from '../services/claimsApi';
import type { DenialReason, HaltedClaim } from '../types/claims';
import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ClaimInformationPanelProps {
  claim: HaltedClaim;
  onAction: (
    action:
      | 'updateCCode'
      | 'pendClaim'
      | 'pendNotes'
      | 'denyClaim'
      | 'resetClaim'
  ) => void;
}

interface ClaimField {
  label: string;
  key: keyof HaltedClaim;
  span?: number;
}

// Form state for UpdateCcode dialog
interface UpdateCcodeForm {
  ccode: string;
  policy: string;
  policyAlias: string;
  forceCcode: boolean;
  forcePolicy: boolean;
  eligMemberId: number;
  ccodeRecId: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLAIM_FIELDS: ClaimField[] = [
  { label: 'Date of Receipt', key: 'dateOfReceipt' },
  { label: 'Claim Type', key: 'claimType' },
  { label: 'Claim Number', key: 'claimNumber' },
  { label: 'Client Claim ID', key: 'clientClaimId' },
  { label: 'Patient Name', key: 'name' },
  { label: 'Group', key: 'group' },
  { label: 'Policy ID', key: 'policy' },
  { label: 'Gender', key: 'gender' },
  { label: 'Service Date', key: 'serviceDate' },
  { label: 'Insured ID', key: 'insuredId' },
  { label: 'Payer', key: 'payer' },
  { label: 'Date of Birth', key: 'dateOfBirth' },
  { label: 'Relationship', key: 'relationship' },
  { label: 'Claim Stream', key: 'claimStream' },
  { label: 'Client Code', key: 'ccode' },
  { label: 'Sender', key: 'sender' },
  { label: 'Address', key: 'address', span: 4 },
];

// Placeholder — replace with value from auth context once available.
const CURRENT_USER = 'system';

// ============================================================================
// SUB-COMPONENT
// ============================================================================

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Typography
      variant='body2'
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 0.5,
        wordBreak: 'break-word',
        minWidth: 0,
      }}
    >
      <Box
        component='span'
        sx={{
          fontWeight: 600,
          color: 'text.secondary',
          textTransform: 'uppercase',
          fontSize: '0.7rem',
          letterSpacing: '0.5px',
          flexShrink: 0,
        }}
      >
        {label}:
      </Box>
      <Box component='span' sx={{ fontWeight: 500, color: 'text.primary' }}>
        {value || '-'}
      </Box>
    </Typography>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClaimInformationPanel({
  claim,
  onAction,
}: ClaimInformationPanelProps) {
  // --------------------------------------------------------------------------
  // Denial reasons — fetched from server on mount, never hardcoded.
  // --------------------------------------------------------------------------
  const [denialReasons, setDenialReasons] = useState<DenialReason[]>([]);
  const [reasonsLoading, setReasonsLoading] = useState(true);
  const [reasonsError, setReasonsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchReasons = async () => {
      setReasonsLoading(true);
      setReasonsError(false);
      try {
        const reasons = await claimsApi.getDenialReasons();
        if (!cancelled) setDenialReasons(reasons);
      } catch {
        if (!cancelled) setReasonsError(true);
      } finally {
        if (!cancelled) setReasonsLoading(false);
      }
    };
    void fetchReasons();
    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------------------------------------
  // Per-claim denial reason selection — cached by claimNumber.
  // --------------------------------------------------------------------------
  const selectionCache = useRef<Map<string, string>>(new Map());
  const [denialReason, setDenialReason] = useState('');

  useEffect(() => {
    setDenialReason(selectionCache.current.get(claim.claimNumber) ?? '');
  }, [claim.claimNumber]);

  const handleDenialReasonChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setDenialReason(value);
    selectionCache.current.set(claim.claimNumber, value);
  };

  // --------------------------------------------------------------------------
  // Per-button loading state — tracks which action is in-flight.
  // Only one action can run at a time — buttons are disabled while loading.
  // --------------------------------------------------------------------------
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const isLoading = (action: string) => actionLoading === action;
  const anyLoading = actionLoading !== null;

  // --------------------------------------------------------------------------
  // Snackbar feedback
  // --------------------------------------------------------------------------
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // --------------------------------------------------------------------------
  // Pend dialog — shared by "Pend Claim" (pended=true) and "Pend Notes" (pended=false)
  // --------------------------------------------------------------------------
  const [pendDialogOpen, setPendDialogOpen] = useState(false);
  const [pendMode, setPendMode] = useState<'pendClaim' | 'pendNotes'>(
    'pendClaim'
  );
  const [pendNotesValue, setPendNotesValue] = useState('');

  const openPendDialog = (mode: 'pendClaim' | 'pendNotes') => {
    setPendMode(mode);
    setPendNotesValue('');
    setPendDialogOpen(true);
  };

  const handlePendSubmit = async () => {
    setActionLoading('pend');
    try {
      await claimsApi.pendClaim({
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        userName: CURRENT_USER,
        pendNotes: pendNotesValue,
        pended: pendMode === 'pendClaim',
        lockExpiration: 0,
        network: claim.network,
      });
      setPendDialogOpen(false);
      setPendNotesValue('');
      showSnackbar('Claim pended successfully.', 'success');
      onAction(pendMode);
    } catch {
      showSnackbar('Failed to pend claim. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // Deny Claim — validates denial reason, calls API
  // --------------------------------------------------------------------------
  const [denyValidationOpen, setDenyValidationOpen] = useState(false);

  const handleDenyClaim = async () => {
    if (!denialReason) {
      setDenyValidationOpen(true);
      return;
    }
    setActionLoading('deny');
    try {
      await claimsApi.denyClaim({
        claimNumber: claim.claimNumber,
        clientClaimNumber: claim.clientClaimId,
        claimType: claim.claimType,
        userName: CURRENT_USER,
        denialReason,
      });
      showSnackbar('Claim denied successfully.', 'success');
      onAction('denyClaim');
    } catch {
      showSnackbar('Failed to deny claim. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // UpdateCcode dialog — pre-filled from claim, user edits key fields
  // --------------------------------------------------------------------------
  const [updateCcodeOpen, setUpdateCcodeOpen] = useState(false);
  const [updateCcodeForm, setUpdateCcodeForm] = useState<UpdateCcodeForm>({
    ccode: '',
    policy: '',
    policyAlias: '',
    forceCcode: false,
    forcePolicy: false,
    eligMemberId: 0,
    ccodeRecId: 0,
  });

  const openUpdateCcodeDialog = () => {
    setUpdateCcodeForm({
      ccode: claim.ccode,
      policy: claim.policy,
      policyAlias: '',
      forceCcode: false,
      forcePolicy: false,
      eligMemberId: 0,
      ccodeRecId: 0,
    });
    setUpdateCcodeOpen(true);
  };

  const handleUpdateCcodeSubmit = async () => {
    setActionLoading('updateCcode');
    try {
      await claimsApi.updateCcode({
        policy: updateCcodeForm.policy,
        ccode: updateCcodeForm.ccode,
        policyAlias: updateCcodeForm.policyAlias,
        forceCcode: updateCcodeForm.forceCcode,
        serviceDate: claim.serviceDate,
        receiptDate: claim.dateOfReceipt,
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        statusCode: '',
        lockedByUser: CURRENT_USER,
        eligMemberId: updateCcodeForm.eligMemberId,
        ccodeRecId: updateCcodeForm.ccodeRecId,
        forcePolicy: updateCcodeForm.forcePolicy,
      });
      setUpdateCcodeOpen(false);
      showSnackbar('CCode updated successfully.', 'success');
      onAction('updateCCode');
    } catch {
      showSnackbar('Failed to update CCode. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // Reset dialog — confirmation before calling reset
  // --------------------------------------------------------------------------
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleResetSubmit = async () => {
    setActionLoading('reset');
    try {
      await claimsApi.resetClaim({
        claimType: claim.claimType,
        network: claim.network,
        statusCode: 0,
        pended: false,
      });
      setResetDialogOpen(false);
      showSnackbar('Claim reset successfully.', 'success');
      onAction('resetClaim');
    } catch {
      showSnackbar('Failed to reset claim. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <>
      <Collapsible title='Claim Information' defaultExpanded={true}>
        <Box sx={{ p: 1.5 }}>
          {/* Claim Information Grid */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {CLAIM_FIELDS.map((field) => (
              <Grid
                key={field.key}
                size={
                  field.span
                    ? { xs: 12, md: field.span }
                    : { xs: 12, sm: 6, md: 2 }
                }
              >
                <InfoField
                  label={field.label}
                  value={String(claim[field.key] ?? '-')}
                />
              </Grid>
            ))}
          </Grid>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Button
              variant='contained'
              color='primary'
              size='small'
              disabled={anyLoading}
              onClick={openUpdateCcodeDialog}
              startIcon={
                isLoading('updateCcode') ? (
                  <CircularProgress size={12} color='inherit' />
                ) : undefined
              }
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Update CCode
            </Button>

            <Button
              variant='contained'
              color='warning'
              size='small'
              disabled={anyLoading}
              onClick={() => openPendDialog('pendClaim')}
              startIcon={
                isLoading('pend') ? (
                  <CircularProgress size={12} color='inherit' />
                ) : undefined
              }
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Pend Claim
            </Button>

            <Button
              variant='outlined'
              color='warning'
              size='small'
              disabled={anyLoading}
              onClick={() => openPendDialog('pendNotes')}
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Pend Notes
            </Button>

            <Button
              variant='outlined'
              color='secondary'
              size='small'
              disabled={anyLoading}
              onClick={() => setResetDialogOpen(true)}
              startIcon={
                isLoading('reset') ? (
                  <CircularProgress size={12} color='inherit' />
                ) : undefined
              }
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Reset
            </Button>

            {/* Denial Reason dropdown */}
            <FormControl
              size='small'
              sx={{ minWidth: 160 }}
              disabled={reasonsLoading || reasonsError || anyLoading}
            >
              <Select
                id='denial-reason'
                value={denialReason}
                onChange={handleDenialReasonChange}
                displayEmpty
                renderValue={(selected: string) => {
                  if (!selected) {
                    return (
                      <Box
                        component='span'
                        sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                      >
                        {reasonsLoading
                          ? 'Loading\u2026'
                          : reasonsError
                            ? 'Unavailable'
                            : 'Denial Reason'}
                      </Box>
                    );
                  }
                  return (
                    denialReasons.find((r) => r.value === selected)?.label ??
                    selected
                  );
                }}
                startAdornment={
                  reasonsLoading ? (
                    <CircularProgress
                      size={12}
                      sx={{ mr: 0.5, flexShrink: 0 }}
                    />
                  ) : undefined
                }
                sx={{
                  height: '26px',
                  fontSize: '0.8125rem',
                  '& .MuiSelect-select': {
                    py: 0,
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
              >
                <MenuItem value=''>
                  <em>Select Reason</em>
                </MenuItem>
                {denialReasons.map((reason) => (
                  <MenuItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant='contained'
              color='error'
              size='small'
              disabled={anyLoading}
              onClick={() => {
                void handleDenyClaim();
              }}
              startIcon={
                isLoading('deny') ? (
                  <CircularProgress size={12} color='inherit' />
                ) : undefined
              }
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Deny Claim
            </Button>
          </Box>
        </Box>
      </Collapsible>

      {/* ── Pend Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={pendDialogOpen}
        onClose={() => {
          if (!anyLoading) setPendDialogOpen(false);
        }}
        maxWidth='xs'
        fullWidth
        PaperProps={{ elevation: 4, sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          {pendMode === 'pendClaim' ? 'Pend Claim' : 'Pend Notes'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Claim <strong>{claim.claimNumber}</strong>
            {pendMode === 'pendClaim'
              ? ' will be pended. Add notes below (optional).'
              : ' — update pend notes below.'}
          </Typography>
          <TextField
            label='Pend Notes'
            value={pendNotesValue}
            onChange={(e) => setPendNotesValue(e.target.value)}
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
            onClick={() => setPendDialogOpen(false)}
            disabled={anyLoading}
            size='small'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handlePendSubmit();
            }}
            disabled={anyLoading}
            size='small'
            variant='contained'
            color='warning'
            startIcon={
              isLoading('pend') ? (
                <CircularProgress size={12} color='inherit' />
              ) : undefined
            }
          >
            {isLoading('pend') ? 'Submitting...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Deny Validation Dialog ───────────────────────────────────────── */}
      <Dialog
        open={denyValidationOpen}
        onClose={() => setDenyValidationOpen(false)}
        aria-labelledby='deny-validation-dialog-title'
        PaperProps={{
          elevation: 4,
          sx: { borderRadius: 2, minWidth: 380, maxWidth: 440 },
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
            <WarningAmberRoundedIcon
              sx={{ color: 'warning.dark', fontSize: 22 }}
            />
          </Box>
          <DialogTitle
            id='deny-validation-dialog-title'
            sx={{
              p: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.3,
            }}
          >
            Select Denial Reason
          </DialogTitle>
        </Box>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2 }}>
          <DialogContentText
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              lineHeight: 1.6,
            }}
          >
            A Denial Reason must be selected before denying a claim.
          </DialogContentText>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            onClick={() => setDenyValidationOpen(false)}
            variant='contained'
            color='warning'
            size='small'
            autoFocus
            sx={{ minWidth: 72, fontWeight: 600 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Update CCode Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={updateCcodeOpen}
        onClose={() => {
          if (!anyLoading) setUpdateCcodeOpen(false);
        }}
        maxWidth='xs'
        fullWidth
        PaperProps={{ elevation: 4, sx: { borderRadius: 2 } }}
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
            value={updateCcodeForm.ccode}
            onChange={(e) =>
              setUpdateCcodeForm((f) => ({ ...f, ccode: e.target.value }))
            }
            size='small'
            fullWidth
            disabled={anyLoading}
          />
          <TextField
            label='Policy'
            value={updateCcodeForm.policy}
            onChange={(e) =>
              setUpdateCcodeForm((f) => ({ ...f, policy: e.target.value }))
            }
            size='small'
            fullWidth
            disabled={anyLoading}
          />
          <TextField
            label='Policy Alias'
            value={updateCcodeForm.policyAlias}
            onChange={(e) =>
              setUpdateCcodeForm((f) => ({ ...f, policyAlias: e.target.value }))
            }
            size='small'
            fullWidth
            disabled={anyLoading}
          />
          <TextField
            label='Elig Member ID'
            type='number'
            value={updateCcodeForm.eligMemberId}
            onChange={(e) =>
              setUpdateCcodeForm((f) => ({
                ...f,
                eligMemberId: Number(e.target.value),
              }))
            }
            size='small'
            fullWidth
            disabled={anyLoading}
            inputProps={{ min: 0 }}
          />
          <TextField
            label='CCode Rec ID'
            type='number'
            value={updateCcodeForm.ccodeRecId}
            onChange={(e) =>
              setUpdateCcodeForm((f) => ({
                ...f,
                ccodeRecId: Number(e.target.value),
              }))
            }
            size='small'
            fullWidth
            disabled={anyLoading}
            inputProps={{ min: 0 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={updateCcodeForm.forceCcode}
                  onChange={(e) =>
                    setUpdateCcodeForm((f) => ({
                      ...f,
                      forceCcode: e.target.checked,
                    }))
                  }
                  disabled={anyLoading}
                  size='small'
                />
              }
              label={<Typography variant='body2'>Force CCode</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={updateCcodeForm.forcePolicy}
                  onChange={(e) =>
                    setUpdateCcodeForm((f) => ({
                      ...f,
                      forcePolicy: e.target.checked,
                    }))
                  }
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
            onClick={() => setUpdateCcodeOpen(false)}
            disabled={anyLoading}
            size='small'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleUpdateCcodeSubmit();
            }}
            disabled={anyLoading}
            size='small'
            variant='contained'
            color='primary'
            startIcon={
              isLoading('updateCcode') ? (
                <CircularProgress size={12} color='inherit' />
              ) : undefined
            }
          >
            {isLoading('updateCcode') ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reset Confirmation Dialog ────────────────────────────────────── */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => {
          if (!anyLoading) setResetDialogOpen(false);
        }}
        maxWidth='xs'
        fullWidth
        PaperProps={{ elevation: 4, sx: { borderRadius: 2 } }}
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
            <WarningAmberRoundedIcon
              sx={{ color: 'warning.dark', fontSize: 22 }}
            />
          </Box>
          <DialogTitle
            sx={{
              p: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Reset Claim
          </DialogTitle>
        </Box>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2 }}>
          <DialogContentText
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              lineHeight: 1.6,
            }}
          >
            This will reset the group data search info for claim{' '}
            <strong>{claim.claimNumber}</strong>. Are you sure?
          </DialogContentText>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
          <Button
            onClick={() => setResetDialogOpen(false)}
            disabled={anyLoading}
            size='small'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleResetSubmit();
            }}
            disabled={anyLoading}
            size='small'
            variant='contained'
            color='warning'
            startIcon={
              isLoading('reset') ? (
                <CircularProgress size={12} color='inherit' />
              ) : undefined
            }
          >
            {isLoading('reset') ? 'Resetting...' : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar feedback ────────────────────────────────────────────── */}
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
