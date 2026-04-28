// src/components/EmployerGroupSearchPanel.tsx

import { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';
import type { EmployerGroupField } from '../utils/scenarioFieldConfig';

// ── MFE widget contract ───────────────────────────────────────────────────────

interface EmployerGroupSearchWidgetProps {
  ccode: string;
  network: string;
  onEmployerGroupSelected: (group: unknown) => void;
  onClientCodeSelected: (client: unknown) => void;
  autoSearch?: boolean;
  policyNum?: string;
  grpName?: string;
  payerName?: string;
  scenario?: string;
  focusedFields?: EmployerGroupField[];
  highlightedFields?: EmployerGroupField[];
}

const EmployerGroupSearchWidget = lazy(
  () => import('employerGroupSearchApp/EmployerGroupSearchWidget')
) as React.LazyExoticComponent<
  React.ComponentType<EmployerGroupSearchWidgetProps>
>;

// ── Public panel props ────────────────────────────────────────────────────────

export interface EmployerGroupSearchPanelProps {
  network: string;
  ccode: string;
  policyNum?: string;
  grpName?: string;
  payerName?: string;
  scenario?: string;
  focusedFields?: EmployerGroupField[];
  highlightedFields?: EmployerGroupField[];
  /** Called with clientCode when the user selects an employer group in the MFE. */
  onCcodeSelected?: (ccode: string) => void;
}

// ── Fallback ──────────────────────────────────────────────────────────────────

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

/** Extract clientCode from the MFE employer group selection payload. */
function extractClientCode(group: unknown): string {
  if (!group || typeof group !== 'object') return '';
  const g = group as Record<string, unknown>;
  return typeof g.clientCode === 'string' ? g.clientCode : '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmployerGroupSearchPanel({
  network,
  ccode,
  policyNum,
  grpName,
  payerName,
  scenario,
  focusedFields,
  highlightedFields,
  onCcodeSelected,
}: EmployerGroupSearchPanelProps) {
  const handleEmployerGroupSelected = (group: unknown) => {
    if (!onCcodeSelected) return;
    const extracted = extractClientCode(group);
    if (extracted) onCcodeSelected(extracted);
  };

  const handleClientCodeSelected = (client: unknown) => {
    if (!onCcodeSelected) return;
    const extracted = extractClientCode(client);
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
      <MfeErrorBoundary mfeName='Employer Group Search'>
        <Suspense fallback={<EmployerGroupSearchFallback />}>
          <EmployerGroupSearchWidget
            ccode={ccode}
            network={network}
            onEmployerGroupSelected={handleEmployerGroupSelected}
            onClientCodeSelected={handleClientCodeSelected}
            autoSearch={true}
            policyNum={policyNum}
            grpName={grpName}
            payerName={payerName}
            scenario={scenario}
            focusedFields={focusedFields}
            highlightedFields={highlightedFields}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
