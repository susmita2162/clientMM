// src/components/ClaimInformationPanel.tsx - SPACE EFFICIENT
import { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  type SelectChangeEvent,
} from '@mui/material';
import Collapsible from './shared/Collapsible';
import type { HaltedClaim } from '../types/claims';

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
  span?: number; // Column span for special fields
}

// Fields in display order - Address placed after Sender with custom span
const CLAIM_FIELDS: ClaimField[] = [
  // Row 1 (6 fields x 2 columns = 12 columns)
  { label: 'Date of Receipt', key: 'dateOfReceipt' },
  { label: 'Claim Type', key: 'claimType' },
  { label: 'Claim Number', key: 'claimNumber' },
  { label: 'Client Claim ID', key: 'clientClaimId' },
  { label: 'Patient Name', key: 'name' },
  { label: 'Group', key: 'group' },

  // Row 2 (6 fields x 2 columns = 12 columns)
  { label: 'Policy ID', key: 'policy' },
  { label: 'Gender', key: 'gender' },
  { label: 'Service Date', key: 'serviceDate' },
  { label: 'Insured ID', key: 'insuredId' },
  { label: 'Payer', key: 'payer' },
  { label: 'Date of Birth', key: 'dateOfBirth' },

  // Row 3 (4 fields x 2 columns + Address spanning 4 columns = 12 columns)
  { label: 'Relationship', key: 'relationship' },
  { label: 'Claim Stream', key: 'claimStream' },
  { label: 'Client Code', key: 'ccode' },
  { label: 'Sender', key: 'sender' },
  { label: 'Address', key: 'address', span: 4 }, // ⭐ Spans remaining 4 columns
];

export default function ClaimInformationPanel({
  claim,
  onAction,
}: ClaimInformationPanelProps) {
  const [denialReason, setDenialReason] = useState('');

  const handleDenialReasonChange = (event: SelectChangeEvent) => {
    setDenialReason(event.target.value);
  };

  const handleDenyClaim = () => {
    if (!denialReason) {
      alert('Please select a denial reason');
      return;
    }
    onAction('denyClaim', { denialReason });
  };

  const InfoField = ({ label, value }: { label: string; value: string }) => (
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
      <Box
        component='span'
        sx={{
          fontWeight: 500,
          color: 'text.primary',
        }}
      >
        {value || '-'}
      </Box>
    </Typography>
  );

  return (
    <Collapsible title='Claim Information' defaultExpanded={true}>
      <Box sx={{ p: 1.5 }}>
        {/* Claim Information Grid */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {CLAIM_FIELDS.map((field) => (
            <Grid
              key={field.key}
              size={
                field.span
                  ? { xs: 12, md: field.span } // Address: 4 columns (rest of row)
                  : { xs: 12, sm: 6, md: 2 } // Regular: 2 columns
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
            sx={{ minWidth: '120px', height: '32px' }}
          >
            Update CCode
          </Button>

          <Button
            variant='contained'
            color='warning'
            size='small'
            onClick={() => onAction('pendClaim')}
            sx={{ minWidth: '120px', height: '32px' }}
          >
            Pend Claim
          </Button>

          <Button
            variant='outlined'
            color='warning'
            size='small'
            onClick={() => onAction('pendNotes')}
            sx={{ minWidth: '120px', height: '32px' }}
          >
            Pend Notes
          </Button>

          <Button
            variant='contained'
            color='error'
            size='small'
            onClick={handleDenyClaim}
            sx={{ minWidth: '120px', height: '32px' }}
          >
            Deny Claim
          </Button>

          <FormControl
            sx={{
              minWidth: 180,
              '& .MuiInputBase-root': {
                height: '32px',
              },
            }}
            size='small'
          >
            <InputLabel id='denial-reason-label'>Denial Reason</InputLabel>
            <Select
              labelId='denial-reason-label'
              id='denial-reason'
              value={denialReason}
              label='Denial Reason'
              onChange={handleDenialReasonChange}
            >
              <MenuItem value=''>
                <em>Select Reason</em>
              </MenuItem>
              <MenuItem value='DUPLICATE_CLAIM'>Duplicate Claim</MenuItem>
              <MenuItem value='INVALID_COVERAGE'>Invalid Coverage</MenuItem>
              <MenuItem value='MISSING_INFO'>Missing Information</MenuItem>
              <MenuItem value='OUT_OF_NETWORK'>Out of Network</MenuItem>
              <MenuItem value='POLICY_EXPIRED'>Policy Expired</MenuItem>
              <MenuItem value='PRE_EXISTING'>Pre-existing Condition</MenuItem>
              <MenuItem value='SERVICE_NOT_COVERED'>
                Service Not Covered
              </MenuItem>
              <MenuItem value='TIMELY_FILING'>Timely Filing Exceeded</MenuItem>
              <MenuItem value='OTHER'>Other</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Collapsible>
  );
}
