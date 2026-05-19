// src/components/TopBanner.tsx
import {
  Box,
  Typography,
  Link as MuiLink,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeMode } from '../ThemeModeProvider';

type TopBannerProps = {
  readonly logoSrc: string;
  readonly logoAlt?: string;
  readonly productName?: string;
};

export default function TopBanner({
  logoSrc,
  logoAlt = 'Company logo',
  productName,
}: TopBannerProps) {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <Box
      component='header'
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {/* Inner row that stays centered to the same width as Container */}
      <Box
        sx={{
          maxWidth: (t) => t.breakpoints.values.xl,
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          py: 0.75,
          px: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          component='img'
          src={logoSrc}
          alt={logoAlt}
          loading='eager'
          draggable={false}
          sx={{
            height: { xs: 22, sm: 26, md: 28 },
            width: 'auto',
            display: 'block',
            ...(mode === 'dark' && {
              backgroundColor: '#fff',
              borderRadius: '2px',
            }),
          }}
        />
        {productName && (
          <Typography
            variant='h6'
            noWrap
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' },
            }}
          >
            {productName}
          </Typography>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip
            title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          >
            <IconButton
              onClick={toggleTheme}
              color='inherit'
              size='small'
              aria-label='toggle theme'
              sx={{
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'rotate(180deg)',
                },
              }}
            >
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          <MuiLink
            component={Link}
            to='/'
            underline='none'
            color='inherit'
            aria-label='Home'
            sx={{ fontSize: '0.9rem' }}
          >
            Home
          </MuiLink>
        </Box>
      </Box>
    </Box>
  );
}
