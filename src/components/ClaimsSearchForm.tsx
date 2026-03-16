import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField, Button, CircularProgress, Box } from '@mui/material';
import type { ClaimsSearchCriteria } from '../types/claims';
import Collapsible from './shared/Collapsible';

// Validation schema
const schema = z.object({
  claimNumber: z.string().optional(),
  clientClaimId: z.string().optional(),
});

type ClaimsSearchForm = z.infer<typeof schema>;

type Props = {
  onSearch: (data: ClaimsSearchCriteria) => void;
  onClear: () => void;
  onClaimSearch?: (claimId: string) => Promise<void>;
};

const DEFAULTS: ClaimsSearchForm = {
  claimNumber: '',
  clientClaimId: '',
};

// Shared field styles - DRY principle
const FIELD_STYLES = {
  width: 240,
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'background.paper',
  },
};

// Shared button styles - DRY principle
const BUTTON_BASE_STYLES = {
  minWidth: 110,
  textTransform: 'uppercase' as const,
  fontWeight: 600,
};

export default function ClaimsSearchForm({
  onSearch,
  onClear,
  onClaimSearch,
}: Props) {
  const [isSearching, setIsSearching] = React.useState(false);

  const { control, handleSubmit, reset } = useForm<ClaimsSearchForm>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const submit = async (data: ClaimsSearchForm) => {
    setIsSearching(true);
    try {
      if (onClaimSearch && (data.claimNumber || data.clientClaimId)) {
        const claimId = data.claimNumber || data.clientClaimId;
        if (claimId) {
          await onClaimSearch(claimId);
          return;
        }
      }

      onSearch(data as ClaimsSearchCriteria);
    } finally {
      setIsSearching(false);
    }
  };

  const clear = () => {
    reset(DEFAULTS);
    onClear();
  };

  // Helper function to render text fields - eliminates duplication
  const renderTextField = (
    name: keyof ClaimsSearchForm,
    label: string,
    placeholder: string
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={field.value ?? ''}
          label={label}
          placeholder={placeholder}
          variant='outlined'
          size='small'
          sx={FIELD_STYLES}
        />
      )}
    />
  );

  return (
    <Collapsible
      title='Search Criteria'
      defaultExpanded
      contentSx={{
        py: 2,
        px: 3,
      }}
    >
      <form onSubmit={handleSubmit(submit)} noValidate>
        {/* Centered container */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {/* Text Fields - using helper function */}
            {renderTextField(
              'claimNumber',
              'Claim Number',
              'Enter claim number'
            )}
            {renderTextField(
              'clientClaimId',
              'Client Claim ID',
              'Enter client claim ID'
            )}

            {/* Search Button */}
            <Button
              type='submit'
              variant='contained'
              disabled={isSearching}
              startIcon={
                isSearching ? (
                  <CircularProgress size={16} color='inherit' />
                ) : undefined
              }
              sx={BUTTON_BASE_STYLES}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>

            {/* Clear Button */}
            <Button
              type='button'
              variant='outlined'
              onClick={clear}
              disabled={isSearching}
              sx={BUTTON_BASE_STYLES}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </form>
    </Collapsible>
  );
}
