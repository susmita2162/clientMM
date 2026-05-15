// src/components/MemberSearchPanel.tsx
//
// Host panel wrapping the MemberSearchWidget MFE remote component.
//
// CHANGES:
//   • Removed onCcodeSelected prop — ccode is now extracted by the parent
//     (ClientManualMatchDashboard) directly from the MemberRecord in
//     handleMemberSelected, alongside eligMemberId and effectiveDate.
//     onCcodeSelected was a subset of what onMemberSelected already provides;
//     keeping both was redundant.
//   • Removed extractCcode helper — no longer needed here.
//   • handleMemberSelected simplifies to a direct forward of the MemberRecord.
//
// NOTE: EmployerGroupSearchPanel keeps its own onCcodeSelected — that panel
// does not expose a full record equivalent.

import { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';
import type {
  MemberRecord,
  MemberSearchMode,
  MemberSearchWidgetProps,
  MemberSearchField,
  MemberSearchForm,
} from 'memberSearchApp/MemberSearchWidget';

// ── Lazy-load the remote widget ───────────────────────────────────────────────

const MemberSearchWidget = lazy(
  () => import('memberSearchApp/MemberSearchWidget')
) as React.LazyExoticComponent<React.ComponentType<MemberSearchWidgetProps>>;

// ── Public panel props ────────────────────────────────────────────────────────

export interface MemberSearchPanelProps {
  /**
   * Called with the full MemberRecord when a member row is selected.
   * Parent extracts: member.ccode, member.id, member.effectiveDate.
   */
  onMemberSelected?: (member: MemberRecord) => void;
  /** Fields to highlight yellow. Source: scenarioConfig.memberFields */
  fields?: MemberSearchField[];
  /** Pre-populated claim values — forwarded to MemberSearchWidget. */
  initialCriteria?: Partial<MemberSearchForm>;
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
            mode={'embedded' as MemberSearchMode}
            fields={fields}
            initialCriteria={initialCriteria}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
