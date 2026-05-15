// src/components/MemberSearchPanel.tsx
//
// Host panel wrapping the MemberSearchWidget MFE remote component.
//
// CHANGES (Fix 1 — eligMemberId / serviceDate from MFE selection):
//   • Added `onMemberSelected` prop — fires with the full MemberRecord on row
//     selection. Host (ClientManualMatchDashboard) extracts:
//       member.id          → eligMemberId (Number) for UpdateCcode payload
//       member.effectiveDate → serviceDate for UpdateCcode payload
//   • `handleMemberSelected` guard fixed: previously returned early when
//     onCcodeSelected was absent, silently dropping onMemberSelected calls.
//     Both callbacks are now independent.

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
  /** Called with the ccode string when a member row is selected. */
  onCcodeSelected?: (ccode: string) => void;
  /**
   * Called with the full MemberRecord when a member row is selected.
   *
   * Host uses:
   *   member.id            → Number(member.id) → UpdateCcodeRequest.eligMemberId
   *   member.effectiveDate → UpdateCcodeRequest.serviceDate
   *
   * Independent of onCcodeSelected — both fire when a row is selected,
   * regardless of whether the other callback is provided.
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract ccode from a MemberRecord.
 * Guards against absent/non-string ccode so onCcodeSelected is not called
 * with an empty string when the field is missing on a record.
 */
function extractCcode(member: MemberRecord): string {
  return typeof member.ccode === 'string' ? member.ccode : '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemberSearchPanel({
  onCcodeSelected,
  onMemberSelected,
  fields,
  initialCriteria,
}: MemberSearchPanelProps) {
  /**
   * Single entry point for all member-row selection callbacks.
   * Both onCcodeSelected and onMemberSelected are independent — a missing
   * one does not suppress the other.
   */
  const handleMemberSelected = (member: MemberRecord) => {
    const extracted = extractCcode(member);
    if (extracted && onCcodeSelected) onCcodeSelected(extracted);
    onMemberSelected?.(member);
  };

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
            onMemberSelected={handleMemberSelected}
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
