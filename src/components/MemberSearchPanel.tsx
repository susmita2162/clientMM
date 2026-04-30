// src/components/MemberSearchPanel.tsx
//
// Host panel wrapping the MemberSearchWidget MFE remote component.
//
// Widget contract (verified against MemberSearchWidget.tsx source):
//   network, ccode, onMemberSelected, autoSearch, mode,
//   focusedFields, highlightedFields
//
// focusedFields / highlightedFields:
//   Produced by getScenarioConfig(claim.scenario) in ClientManualMatchDashboard
//   and forwarded here → forwarded to the widget → forwarded to MemberSearch
//   → applied as yellow background sx on each targeted form field.
//
// onMemberSelected wiring status:
//   Widget now destructures onMemberSelected (bug fixed in MemberSearchWidget.tsx).
//   Chain: MemberSearchWidget → CollapsibleMemberResults → MemberResults.
//   MemberResults.tsx still needs onRowSelect wired to DataGrid row-click.

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
  network: string;
  ccode: string;
  onCcodeSelected?: (ccode: string) => void;
  focusedFields?: MemberSearchField[];
  highlightedFields?: MemberSearchField[];
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
 * MemberRecord.ccode is optional — guard prevents a no-op state update
 * when the field is absent on a record.
 */
function extractCcode(member: MemberRecord): string {
  return typeof member.ccode === 'string' ? member.ccode : '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemberSearchPanel({
  network,
  ccode,
  onCcodeSelected,
  focusedFields,
  highlightedFields,
  initialCriteria,
}: MemberSearchPanelProps) {
  const handleMemberSelected = (member: MemberRecord) => {
    if (!onCcodeSelected) return;
    const extracted = extractCcode(member);
    if (extracted) onCcodeSelected(extracted);
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
            network={network}
            ccode={ccode}
            onMemberSelected={handleMemberSelected}
            autoSearch={true}
            mode={'embedded' as MemberSearchMode}
            focusedFields={focusedFields}
            highlightedFields={highlightedFields}
            initialCriteria={initialCriteria}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
