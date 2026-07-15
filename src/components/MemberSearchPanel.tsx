// src/components/MemberSearchPanel.tsx
//
// Host panel wrapping the MemberSearchWidget component.
//
// CHANGES (npm package migration):
//   • MemberSearchWidget is no longer a Module Federation remote — it is
//     now imported directly from the installed npm package
//     `ucp-member-search-ui`. Import is static (build-time), not lazy.
//   • Types (MemberRecord, MemberSearchField, MemberSearchForm) now come
//     from the package's own shipped .d.ts, not an ambient ...
//     module-federation.d.ts declaration.
//   • Suspense/MfeErrorBoundary retained — MemberSearchWidget can still be
//     code-split via React.lazy() if desired later; error boundary still
//     guards against component-level render errors regardless of source.
//
// PRE-REQUISITE: package must be bumped to >=0.0.2 — that version adds the
// MemberSearchField / MemberSearchMode type exports this file relies on.
//
// NOTE: EmployerGroupSearchPanel is UNCHANGED — it remains a Module
// Federation remote and keeps its own onCcodeSelected prop.

import { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';
import {
  MemberSearchWidget,
  type MemberRecord,
  type MemberSearchField,
  type MemberSearchForm,
} from 'ucp-member-search-ui';

// ── Public panel props ────────────────────────────────────────────────────────

export interface MemberSearchPanelProps {
  /**
   * Called with the full MemberRecord when a member row is selected.
   * Parent extracts: member.ccode, member.id, member.effectiveDate.
   */
  readonly onMemberSelected?: (member: MemberRecord) => void;
  /** Fields to highlight yellow. Source: scenarioConfig.memberFields */
  readonly fields?: MemberSearchField[];
  /** Pre-populated claim values — forwarded to MemberSearchWidget. */
  readonly initialCriteria?: Partial<MemberSearchForm>;
}

// ── Loading fallback ──────────────────────────────────────────────────────────

function MemberSearchFallback() {
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
        Loading Member Search...
      </Typography>
    </Box>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemberSearchPanel({
  onMemberSelected,
  fields,
  initialCriteria,
}: MemberSearchPanelProps) {
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
      <MfeErrorBoundary mfeName='Member Search'>
        <Suspense fallback={<MemberSearchFallback />}>
          <MemberSearchWidget
            onMemberSelected={onMemberSelected}
            autoSearch={true}
            mode='embedded'
            fields={fields}
            initialCriteria={initialCriteria}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
