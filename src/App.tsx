// src/App.tsx
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import TopBanner from './components/TopBanner';
import BottomBanner from './components/BottomBanner';

/**
 * App component - NO ThemeProvider here!
 * Theme is managed in main.tsx with ThemeModeProvider
 */
export default function App() {
  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        maxWidth: '100vw',
        bgcolor: 'background.default',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          px: { xs: 1, sm: 2 },
          py: { xs: 0.5, sm: 1 },
        }}
      >
        <TopBanner
          logoSrc='/vite.svg'
          logoAlt='Claims App Logo'
          productName='Claims Summary Dashboard'
        />

        {/* MIDDLE: Main content area - routed components render here via Outlet */}
        <Box
          component='main'
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: 'auto', // Allow scrolling if content is too large
            mt: 1,
          }}
        >
          <Outlet />
        </Box>

        <Box sx={{ mt: 1 }}>
          <BottomBanner
            companyLabel='Your Company'
            companyUrl='https://yourcompany.com'
            companyColor='success.main'
            extra='All rights reserved.'
          />
        </Box>
      </Box>
    </Box>
  );
}
