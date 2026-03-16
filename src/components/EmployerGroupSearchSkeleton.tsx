// src/components/EmployerGroupSearchSkeleton.tsx - FIXED VERSION
import { Box, Paper, Skeleton, Typography, Chip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import Collapsible from './shared/Collapsible';

interface EmployerGroupSearchSkeletonProps {
  insuredId: string;
  network: string;
}

/**
 * EmployerGroupSearchSkeleton - Placeholder for Employer Group Search Micro-Frontend
 *
 * FIX 2: Changed process.env.NODE_ENV → import.meta.env.DEV
 */
export default function EmployerGroupSearchSkeleton({
  insuredId,
  network,
}: EmployerGroupSearchSkeletonProps) {
  return (
    <Collapsible title='Employer Group Search' defaultExpanded={true}>
      <Box sx={{ p: 2 }}>
        {/* Info Banner */}
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: 'success.light',
            border: '1px dashed',
            borderColor: 'success.main',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InfoIcon color='success' />
            <Typography variant='subtitle2' fontWeight={600}>
              Micro-Frontend Placeholder
            </Typography>
          </Box>
          <Typography variant='body2' sx={{ mb: 1 }}>
            Employer Group Search micro-frontend will be loaded here.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Insured ID: ${insuredId}`}
              size='small'
              color='success'
              variant='outlined'
            />
            <Chip
              label={`Network: ${network}`}
              size='small'
              color='success'
              variant='outlined'
            />
          </Box>
        </Paper>

        {/* Search Criteria Skeleton */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mb: 3,
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <Skeleton variant='rectangular' height={40} />
          <Skeleton variant='rectangular' height={40} />
        </Box>

        {/* Results Table Skeleton */}
        <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 600 }}>
          Search Results
        </Typography>
        <Paper variant='outlined'>
          <Box sx={{ p: 2 }}>
            {/* Table Header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1,
                mb: 2,
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant='text' width='80%' />
              ))}
            </Box>

            {/* Table Rows */}
            {[1, 2, 3].map((row) => (
              <Box
                key={row}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 1,
                  mb: 1.5,
                }}
              >
                {[1, 2, 3, 4].map((col) => (
                  <Skeleton key={col} variant='text' />
                ))}
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Integration Instructions - FIX 2: Use import.meta.env.DEV */}
        {import.meta.env.DEV && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: 'warning.light',
              borderRadius: 1,
              fontSize: '0.75rem',
            }}
          >
            <strong>⚠️ TODO:</strong> Replace this skeleton with:
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>Web Component integration, OR</li>
              <li>Module Federation integration, OR</li>
              <li>iframe integration</li>
            </ul>
            See EmployerGroupSearchPanel-module-federation.tsx for Module
            Federation example.
          </Box>
        )}
      </Box>
    </Collapsible>
  );
}
