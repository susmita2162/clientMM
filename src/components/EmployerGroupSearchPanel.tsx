// src/components/EmployerGroupSearchPanel.tsx
//
// Host panel wrapping the EmployerGroupSearchWidget.
//
// CHANGES (npm package migration):
//   • EmployerGroupSearchWidget is no longer a Module Federation remote — it
//     is now imported directly from the installed npm package
//     `ucp-group-search-ui`. Import is static (build-time), not lazy.
//   • Types (ClientRecord, EmployerGroupField, EmployerGroupSearchForm) now
//     come from the package's own shipped .d.ts, not an ambient
//     module-federation.d.ts declaration.
//   • Suspense/MfeErrorBoundary retained — the widget can still be
//     code-split via React.lazy() later if desired; the error boundary still
//     guards against component-level render errors regardless of source.
//
// PRE-REQUISITE: ucp-group-search-ui must be >=0.0.2 — that version adds the
// EmployerGroupSearchWidget / ClientRecord / EmployerGroupField exports this
// file relies on.
//
// Flash-and-revert fix (from prior session, retained):
//   extractCcode reads ClientRecord.ccode (required field).
//   The widget fires onClientCodeSelected exactly once per row click.

import { Suspense, useCallback } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';
import {
  EmployerGroupSearchWidget,
  configureGroupSearchService,
  type ClientRecord,
  type EmployerGroupField,
  type EmployerGroupSearchForm,
} from 'ucp-group-search-ui';

// Configure once at module load — before any EmployerGroupSearchPanel
// instance renders, and therefore before the widget's own autoSearch effect
// can fire. Calling this from useEffect races the child's mount effect and
// loses when autoSearch=true, since the child fetches before the parent's
// effect runs. Same reasoning as MemberSearchPanel's configureMemberService.
configureGroupSearchService({
  mode: import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock',
  liveBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  mockBaseUrl: import.meta.env.VITE_MOCK_API_BASE_URL ?? '',
});

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
 * ClientRecord.ccode is REQUIRED per ucp-group-search-ui's types.
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
      // matchType is present on ClientRecord at runtime; cast retained until
      // the package's ClientRecord type declares it explicitly.
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
