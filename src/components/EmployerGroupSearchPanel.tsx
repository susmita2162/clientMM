// src/components/EmployerGroupSearchPanel.tsx
//
// Host panel wrapping the EmployerGroupSearchWidget MFE remote component.
//
// Widget contract (verified against EmployerGroupSearchWidget.tsx source):
//   ccode, network, onClientCodeSelected, autoSearch,
// fields:
//   scenarioConfig.employerFields from Dashboard → widget → EmployerGroupSearchForm
//   → yellow background sx on each targeted form field.
//
// EG_FIELD_TO_FORM_KEY mapping (defined in EmployerGroupSearchForm.tsx):
//   'network'             → 'network'
//   'policyAlias'         → 'policyNumAlias'
//   'groupNameAlias'      → 'groupNameAlias'
//   'parentCodeDescAlias' → 'parentCodeDescription'
//   'clientCode'          → 'ccode'
//
// Flash-and-revert fix (from prior session):
//   extractCcode reads ClientRecord.ccode (required field).
//   The widget fires onClientCodeSelected exactly once per row click.

import { Suspense, lazy, useCallback } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';
import type {
  ClientRecord,
  EmployerGroupField,
  EmployerGroupSearchForm,
} from 'employerGroupSearchApp/EmployerGroupSearchWidget';

// ── Lazy-load the remote widget ───────────────────────────────────────────────

const EmployerGroupSearchWidget = lazy(
  () => import('employerGroupSearchApp/EmployerGroupSearchWidget')
);

// ── Public panel props ────────────────────────────────────────────────────────

export interface EmployerGroupSearchPanelProps {
  readonly onCcodeSelected?: (ccode: string, matchType?: string) => void;
  /** Fields to highlight yellow. Source: scenarioConfig.employerFields */
  readonly fields?: EmployerGroupField[];
  /** Pre-populated claim values — forwarded to EmployerGroupSearchWidget. */
  readonly initialCriteria?: Partial<EmployerGroupSearchForm>;
}

// ── Loading fallback ──────────────────────────────────────────────────────────

function EmployerGroupSearchFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        gap: 2,
      }}
    >
      <CircularProgress size={40} />
      <Typography variant='body2' color='text.secondary'>
        Loading Employer Group Search...
      </Typography>
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract ccode from a ClientRecord.
 * ClientRecord.ccode is REQUIRED per module-federation.d.ts.
 * Guard prevents a no-op state update on unexpected type mismatch.
 */
function extractCcode(client: ClientRecord): string {
  return typeof client.ccode === 'string' ? client.ccode : '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmployerGroupSearchPanel({
  onCcodeSelected,
  fields,
  initialCriteria,
}: EmployerGroupSearchPanelProps) {
  // useCallback is required here — not optional.
  // Without it: every Dashboard re-render produces a new function reference →
  // Widget's onClientCodeSelected dep changes → handleClientCodeSelect recreates
  // → ClientCodesGrid useEffect re-runs (onRowSelect is in its deps) → re-fetch
  // → auto-selects row 1 → reverts the user's selection (flash-and-revert bug).
  // onCcodeSelected is setSelectedCcode (useState setter) — stable by guarantee.
  const handleClientCodeSelected = useCallback(
    (client: ClientRecord) => {
      if (!onCcodeSelected) return;
      const extracted = extractCcode(client);
      if (!extracted) return;
      // matchType is present on ClientRecord from EmployerGroupSearchWidget at runtime.
      // Cast needed because module-federation.d.ts may not yet declare it explicitly.
      // If it does, remove the cast and access client.matchType directly.
      const matchType = (client as ClientRecord & { matchType?: string | null })
        .matchType;
      onCcodeSelected(extracted, matchType ?? undefined);
    },
    [onCcodeSelected]
  );

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <MfeErrorBoundary mfeName='Employer Group Search'>
        <Suspense fallback={<EmployerGroupSearchFallback />}>
          <EmployerGroupSearchWidget
            onClientCodeSelected={handleClientCodeSelected}
            autoSearch={true}
            fields={fields}
            initialCriteria={initialCriteria}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
