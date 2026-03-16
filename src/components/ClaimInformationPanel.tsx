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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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
    action: 'updateCCode' | 'pendClaim' | 'pendNotes' | 'denyClaim',
    data?: any
  ) => void;
}

interface ClaimField {
  label: string;
  key: keyof HaltedClaim;
  span?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Fields in display order — Address spans remaining columns in its row
const CLAIM_FIELDS: ClaimField[] = [
  // Row 1 (6 fields × 2 columns = 12 columns)
  { label: 'Date of Receipt', key: 'dateOfReceipt' },
  { label: 'Claim Type', key: 'claimType' },
  { label: 'Claim Number', key: 'claimNumber' },
  { label: 'Client Claim ID', key: 'clientClaimId' },
  { label: 'Patient Name', key: 'name' },
  { label: 'Group', key: 'group' },

  // Row 2 (6 fields × 2 columns = 12 columns)
  { label: 'Policy ID', key: 'policy' },
  { label: 'Gender', key: 'gender' },
  { label: 'Service Date', key: 'serviceDate' },
  { label: 'Insured ID', key: 'insuredId' },
  { label: 'Payer', key: 'payer' },
  { label: 'Date of Birth', key: 'dateOfBirth' },

  // Row 3 (4 fields × 2 columns + Address spanning 4 columns = 12 columns)
  { label: 'Relationship', key: 'relationship' },
  { label: 'Claim Stream', key: 'claimStream' },
  { label: 'Client Code', key: 'ccode' },
  { label: 'Sender', key: 'sender' },
  { label: 'Address', key: 'address', span: 4 },
];

// ============================================================================
// SUB-COMPONENT — kept stable with memo would be ideal, but inline is fine
// at this scale since the parent re-renders are bounded.
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
  // Denial reasons — fetched from the server on mount.
  // Never hardcoded in the UI.
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

    fetchReasons();

    // Cleanup: ignore stale responses if component unmounts mid-flight
    return () => {
      cancelled = true;
    };
  }, []); // Fetch once on dashboard load — denial reasons are static ref data

  // --------------------------------------------------------------------------
  // Per-claim denial reason selection.
  //
  // A useRef Map is used so that if the parent renders a different claim into
  // the same panel instance (e.g. queue navigation), the user's selection for
  // each claim is independently preserved for the lifetime of this page.
  // --------------------------------------------------------------------------
  const selectionCache = useRef<Map<string, string>>(new Map());
  const [denialReason, setDenialReason] = useState('');

  // When the claim identity changes, restore the cached selection (or reset).
  useEffect(() => {
    setDenialReason(selectionCache.current.get(claim.claimNumber) ?? '');
  }, [claim.claimNumber]);

  const handleDenialReasonChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setDenialReason(value);
    selectionCache.current.set(claim.claimNumber, value);
  };

  // --------------------------------------------------------------------------
  // Deny Claim validation modal
  // --------------------------------------------------------------------------
  const [denyValidationOpen, setDenyValidationOpen] = useState(false);

  const handleDenyClaim = () => {
    if (!denialReason) {
      setDenyValidationOpen(true);
      return;
    }
    onAction('denyClaim', { denialReason });
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
                  value={String(claim[field.key] || '-')}
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
              onClick={() => onAction('updateCCode')}
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Update CCode
            </Button>

            <Button
              variant='contained'
              color='warning'
              size='small'
              onClick={() => onAction('pendClaim')}
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Pend Claim
            </Button>

            <Button
              variant='outlined'
              color='warning'
              size='small'
              onClick={() => onAction('pendNotes')}
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Pend Notes
            </Button>

            {/* Denial Reason dropdown — dynamically populated from server.
                No InputLabel used here intentionally: floating labels add
                implicit top-padding to FormControl that breaks height
                alignment in a compact action bar. displayEmpty + placeholder
                MenuItem is the correct pattern for toolbar-style selects. */}
            <FormControl
              size='small'
              sx={{ minWidth: 160 }}
              disabled={reasonsLoading || reasonsError}
            >
              <Select
                id='denial-reason'
                value={denialReason}
                onChange={handleDenialReasonChange}
                displayEmpty
                renderValue={(selected) => {
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
              onClick={handleDenyClaim}
              sx={{ minWidth: '60px', height: '26px', fontSize: '0.8125rem' }}
            >
              Deny Claim
            </Button>
          </Box>
        </Box>
      </Collapsible>

      {/* ------------------------------------------------------------------ */}
      {/* Denial Reason Validation Modal                                       */}
      {/* Shown when "Deny Claim" is clicked without a reason selected.        */}
      {/* Pattern: warning icon + accent header + clear message + single CTA  */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={denyValidationOpen}
        onClose={() => setDenyValidationOpen(false)}
        aria-labelledby='deny-validation-dialog-title'
        aria-describedby='deny-validation-dialog-description'
        PaperProps={{
          elevation: 4,
          sx: { borderRadius: 2, minWidth: 380, maxWidth: 440 },
        }}
      >
        {/* Accent header bar with icon */}
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
              bgcolor: 'rgba(237, 108, 2, 0.12)', // warning.main @12% — no custom token needed
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
            id='deny-validation-dialog-description'
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
