// src/components/MemberSearchPanel.tsx

import { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MfeErrorBoundary } from './MfeErrorBoundary';
import type { MemberSearchField } from '../utils/scenarioFieldConfig';

interface MemberSearchWidgetProps {
  network: string;
  ccode: string;
  onMemberSelected: (member: unknown) => void;
  autoSearch?: boolean;
  mode?: string;
  insuredId?: string;
  serviceDate?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  scenario?: string;
  focusedFields?: MemberSearchField[];
  highlightedFields?: MemberSearchField[];
}

const MemberSearchWidget = lazy(
  () => import('memberSearchApp/MemberSearchWidget')
) as React.LazyExoticComponent<React.ComponentType<MemberSearchWidgetProps>>;

export interface MemberSearchPanelProps {
  network: string;
  ccode: string;
  insuredId?: string;
  serviceDate?: string;
  insuredFirstName?: string;
  insuredLastName?: string;
  insuredDob?: string;
  insuredGender?: string;
  scenario?: string;
  focusedFields?: MemberSearchField[];
  highlightedFields?: MemberSearchField[];
  /** Called with ccode when the user selects a member in the MFE. */
  onCcodeSelected?: (ccode: string) => void;
}

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

/** Extract ccode from the MFE member selection payload. */
function extractCcode(member: unknown): string {
  if (!member || typeof member !== 'object') return '';
  const m = member as Record<string, unknown>;
  const value = m.ccode;
  return typeof value === 'string' ? value : '';
}

export default function MemberSearchPanel({
  network,
  ccode,
  insuredId,
  serviceDate,
  insuredFirstName,
  insuredLastName,
  insuredDob,
  insuredGender,
  scenario,
  focusedFields,
  highlightedFields,
  onCcodeSelected,
}: MemberSearchPanelProps) {
  const handleMemberSelected = (member: unknown) => {
    if (onCcodeSelected) {
      const extracted = extractCcode(member);
      if (extracted) onCcodeSelected(extracted);
    }
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
            mode='embedded'
            insuredId={insuredId}
            serviceDate={serviceDate}
            firstName={insuredFirstName}
            lastName={insuredLastName}
            dateOfBirth={insuredDob}
            gender={insuredGender}
            scenario={scenario}
            focusedFields={focusedFields}
            highlightedFields={highlightedFields}
          />
        </Suspense>
      </MfeErrorBoundary>
    </Box>
  );
}
