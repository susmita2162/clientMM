// src/components/ClaimInfoGrid.tsx
// Pure display component — no state, no side effects.
// Renders the claim data grid used inside ClaimInformationPanel.
import { Box, Grid, Typography } from '@mui/material';
import type { HaltedClaim } from '../types/claims';

interface ClaimField {
  label: string;
  key: keyof HaltedClaim;
  span?: number;
}

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

interface Props {
  claim: HaltedClaim;
}

export default function ClaimInfoGrid({ claim }: Props) {
  return (
    <Grid container spacing={1} sx={{ mb: 1 }}>
      {CLAIM_FIELDS.map((field) => (
        <Grid
          key={field.key}
          size={
            field.span ? { xs: 12, md: field.span } : { xs: 12, sm: 6, md: 2 }
          }
        >
          <InfoField
            label={field.label}
            value={String(claim[field.key] ?? '-')}
          />
        </Grid>
      ))}
    </Grid>
  );
}
