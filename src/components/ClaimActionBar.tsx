// src/components/ClaimActionBar.tsx
// Action buttons row for ClaimInformationPanel.
//
// Button state rules (driven by isPended prop):
//   isPended === false (pendedClaim "N"): Pend Claim ENABLED, Pend Notes DISABLED
//   isPended === true  (pendedClaim "Y"): Pend Claim DISABLED, Pend Notes ENABLED
//
// This reflects the workflow: a halted claim arrives un-pended; the user
// pends it first (Pend Claim), after which they can update notes (Pend Notes).

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { claimsApi } from '../services/claimsApi';
import type { DenialReason, HaltedClaim } from '../types/claims';
import type { PendMode } from './PendDialog';

interface Props {
  claim: HaltedClaim;
  anyLoading: boolean;
  actionLoading: string | null;
  /**
   * Whether the claim is currently pended (pendedClaim === "Y").
   * Controls which pend button is enabled:
   *   false → Pend Claim enabled, Pend Notes disabled
   *   true  → Pend Claim disabled, Pend Notes enabled
   */
  isPended: boolean;
  onPendClick: (mode: PendMode) => void;
  onUpdateCcodeClick: () => void;
  onDenySubmit: (reason: string) => void;
}

export default function ClaimActionBar({
  claim,
  anyLoading,
  actionLoading,
  isPended,
  onPendClick,
  onUpdateCcodeClick,
  onDenySubmit,
}: Props) {
  // --------------------------------------------------------------------------
  // Denial reasons
  // --------------------------------------------------------------------------
  const [denialReasons, setDenialReasons] = useState<DenialReason[]>([]);
  const [reasonsLoading, setReasonsLoading] = useState(true);
  const [reasonsError, setReasonsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
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
    void fetch();
    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------------------------------------
  // Denial reason selection — cached per claim number
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
  // Deny validation dialog — no reason selected
  // --------------------------------------------------------------------------
  const [denyValidationOpen, setDenyValidationOpen] = useState(false);

  const handleDenyClick = () => {
    if (!denialReason) {
      setDenyValidationOpen(true);
      return;
    }
    onDenySubmit(denialReason);
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const BTN = {
    minWidth: '60px',
    height: '26px',
    fontSize: '0.8125rem',
  } as const;

  return (
    <>
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
          onClick={onUpdateCcodeClick}
          startIcon={
            actionLoading === 'updateCcode' ? (
              <CircularProgress size={12} color='inherit' />
            ) : undefined
          }
          sx={BTN}
        >
          Update CCode
        </Button>

        {/*
          Pend Claim — enabled when claim is NOT yet pended.
          Disabled once claim has been pended (user should use Pend Notes instead).
        */}
        <Button
          variant='contained'
          color='warning'
          size='small'
          disabled={anyLoading || isPended}
          onClick={() => onPendClick('pendClaim')}
          startIcon={
            actionLoading === 'pend' ? (
              <CircularProgress size={12} color='inherit' />
            ) : undefined
          }
          sx={BTN}
        >
          Pend Claim
        </Button>

        {/*
          Pend Notes — enabled only after claim has been pended.
          Allows updating notes on an already-pended claim.
        */}
        <Button
          variant='outlined'
          color='warning'
          size='small'
          disabled={anyLoading || !isPended}
          onClick={() => onPendClick('pendNotes')}
          sx={BTN}
        >
          Pend Notes
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
                <CircularProgress size={12} sx={{ mr: 0.5, flexShrink: 0 }} />
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
          onClick={handleDenyClick}
          startIcon={
            actionLoading === 'deny' ? (
              <CircularProgress size={12} color='inherit' />
            ) : undefined
          }
          sx={BTN}
        >
          Deny Claim
        </Button>
      </Box>

      {/* Deny validation dialog — no reason selected */}
      <Dialog
        open={denyValidationOpen}
        onClose={() => setDenyValidationOpen(false)}
        aria-labelledby='deny-validation-title'
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
            id='deny-validation-title'
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
    </>
  );
}
