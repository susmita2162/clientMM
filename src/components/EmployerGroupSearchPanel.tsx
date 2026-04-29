// src/components/EmployerGroupSearchPanel.tsx
//
// Host panel wrapping the EmployerGroupSearchWidget MFE remote component.
//
// Widget contract (verified against EmployerGroupSearchWidget.tsx source):
//   ccode, network, onClientCodeSelected, autoSearch,
//   focusedFields, highlightedFields
//
// focusedFields / highlightedFields:
//   Produced by getScenarioConfig(claim.scenario) in ClientManualMatchDashboard
//   and forwarded here → forwarded to the widget → forwarded to
//   EmployerGroupSearchForm → applied as yellow background sx on targeted fields.
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
  EmployerGroupSearchWidgetProps,
  EmployerGroupField,
} from 'employerGroupSearchApp/EmployerGroupSearchWidget';

// ── Lazy-load the remote widget ───────────────────────────────────────────────

const EmployerGroupSearchWidget = lazy(
  () => import('employerGroupSearchApp/EmployerGroupSearchWidget')
) as React.LazyExoticComponent<
  React.ComponentType<EmployerGroupSearchWidgetProps>
>;

// ── Public panel props ────────────────────────────────────────────────────────

export interface EmployerGroupSearchPanelProps {
  network: string;
  ccode: string;
  /** Called with ccode when a client code row is selected. */
  onCcodeSelected?: (ccode: string) => void;
  /**
   * Fields to pre-populate AND highlight yellow.
   * Source: getScenarioConfig(scenario).employerFocused
   */
  focusedFields?: EmployerGroupField[];
  /**
   * Fields to highlight yellow only (not pre-populated).
   * Source: getScenarioConfig(scenario).employerHighlighted
   */
  highlightedFields?: EmployerGroupField[];
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
  network,
  ccode,
  onCcodeSelected,
  focusedFields,
  highlightedFields,
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
      if (extracted) onCcodeSelected(extracted);
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
            ccode={ccode}
            network={network}
            onClientCodeSelected={handleClientCodeSelected}
            autoSearch={true}
            focusedFields={focusedFields}
            highlightedFields={highlightedFields}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
