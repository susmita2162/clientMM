// src/components/BottomBanner.tsx
import * as React from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

// S6759: all props marked readonly
type BottomBannerProps = {
  readonly companyLabel?: string;
  readonly companyUrl?: string;
  readonly companyColor?: string;
  readonly extra?: React.ReactNode;
};

export default function BottomBanner({
  companyLabel = 'Your Company',
  companyUrl,
  companyColor = 'success.main',
  extra,
}: BottomBannerProps) {
  const year = new Date().getFullYear();
  const isExternal = !!companyUrl && /^https?:\/\//i.test(companyUrl);

  const linkSx = {
    color: companyColor,
    fontWeight: 600,
    '&:hover': { textDecoration: 'underline' },
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: 2,
      borderRadius: 0.5,
    },
  } as const;

  // S3358: nested ternary extracted to if/else — logic is identical
  let CompanyNode: React.ReactNode;
  if (!companyUrl) {
    CompanyNode = (
      <Box component='span' sx={linkSx}>
        {companyLabel}
      </Box>
    );
  } else if (isExternal) {
    CompanyNode = (
      <MuiLink
        href={companyUrl}
        target='_blank'
        rel='noopener noreferrer'
        underline='hover'
        sx={linkSx}
        aria-label={`${companyLabel} (opens in a new tab)`}
      >
        {companyLabel}
      </MuiLink>
    );
  } else {
    CompanyNode = (
      <MuiLink
        component={RouterLink}
        to={companyUrl}
        underline='hover'
        sx={linkSx}
      >
        {companyLabel}
      </MuiLink>
    );
  }

  return (
    // S6819: <footer> already has the implicit ARIA role "contentinfo" —
    // the explicit role="contentinfo" attribute was redundant and removed.
    <Box
      component='footer'
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      {/* Inner centered row */}
      <Box
        sx={{
          maxWidth: (t) => t.breakpoints.values.xl,
          mx: 'auto',
          py: 0.5,
          px: { xs: 1.5, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.125,
          textAlign: 'center',
        }}
      >
        <Typography variant='body2' sx={{ fontSize: '0.8125rem' }}>
          {' '}
          © {year} {CompanyNode}
        </Typography>
        {extra && (
          <Typography variant='caption' sx={{ fontSize: '0.7rem' }}>
            {' '}
            {extra}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
