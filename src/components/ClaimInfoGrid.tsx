// src/components/ClaimInfoGrid.tsx
// Pure display component — no state, no side effects.
// Renders the claim data grid inside ClaimInformationPanel.
//
// selectedCcode: live value from MFE row selection (Member Search or Employer
//   Group Search). When present it overrides claim.ccode in the "Client Code"
//   field so the user sees the value they are about to commit via Update CCode.
//   The value is rendered in primary.main to signal a pending (uncommitted)
//   selection — no visual change when selectedCcode equals claim.ccode.

import { Box, Grid, Typography } from '@mui/material';
import type { HaltedClaim } from '../types/claims';

// ── Field config ──────────────────────────────────────────────────────────────

// Restricts a key type to only the properties of T whose value is
// string-like — excludes array/object fields (e.g. HaltedClaim.pendNotes)
// so String(claim[field.key]) is provably safe, no [object Object] risk.
type StringKeys<T> = {
  [K in keyof T]-?: T[K] extends string | number | boolean | null | undefined
    ? K
    : never;
}[keyof T];

interface ClaimField {
  label: string;
  key: StringKeys<HaltedClaim>;
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

// ── InfoField ─────────────────────────────────────────────────────────────────

interface InfoFieldProps {
  readonly label: string;
  readonly value: string;
  /**
   * When true the value is rendered in primary.main to indicate a pending
   * (uncommitted) selection from a MFE search panel.
   */
  readonly pendingSelection?: boolean;
}

function InfoField({ label, value, pendingSelection = false }: InfoFieldProps) {
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
      <Box
        component='span'
        sx={{
          fontWeight: 600,
          color: pendingSelection ? 'primary.main' : 'text.primary',
          transition: 'color 0.2s',
        }}
      >
        {value || '-'}
      </Box>
    </Typography>
  );
}

// ── ClaimInfoGrid ─────────────────────────────────────────────────────────────

interface Props {
  readonly claim: HaltedClaim;
  /**
   * Live ccode from MFE row selection (Member Search → ccode,
   * Employer Group Search → clientCode).
   *
   * When present:
   *   • Displayed in the "Client Code" field instead of claim.ccode.
   *   • Rendered in primary.main when it differs from claim.ccode,
   *     signalling a pending Update CCode action.
   */
  readonly selectedCcode?: string;
}

export default function ClaimInfoGrid({ claim, selectedCcode }: Props) {
  return (
    <Grid container spacing={1} sx={{ mb: 1 }}>
      {CLAIM_FIELDS.map((field) => {
        const isClientCode = field.key === 'ccode';

        // For the ccode field: show selectedCcode when present,
        // otherwise show the original claim value.
        const displayValue =
          isClientCode && selectedCcode
            ? selectedCcode
            : String(claim[field.key] ?? '-');

        // Highlight only when the selected value differs from the
        // original claim ccode (i.e. there is an actual pending change).
        const pendingSelection =
          isClientCode && !!selectedCcode && selectedCcode !== claim.ccode;

        return (
          <Grid
            key={field.key}
            size={
              field.span ? { xs: 12, md: field.span } : { xs: 12, sm: 6, md: 2 }
            }
          >
            <InfoField
              label={field.label}
              value={displayValue}
              pendingSelection={pendingSelection}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
