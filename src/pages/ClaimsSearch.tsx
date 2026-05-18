import { useCallback } from 'react';
import ClaimsSearchForm from '../components/ClaimsSearchForm';
import { Box } from '@mui/material';
import type { ClaimsSearchCriteria } from '../types/claims';
import ClaimsTable from '../components/ClaimsTable/ClaimsTable';

export default function ClaimsSearch() {
  // Handle search
  const handleSearch = useCallback((_criteria: ClaimsSearchCriteria) => {}, []);

  const handleClear = useCallback(() => {}, []);

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <Box sx={{ minWidth: 0, maxHeight: '45vh', overflow: 'auto' }}>
        <ClaimsSearchForm onSearch={handleSearch} onClear={handleClear} />
      </Box>

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <ClaimsTable />
      </Box>
    </Box>
  );
}
