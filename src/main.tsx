// src/main.tsx - FIXED VERSION
import React, { useMemo, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from './theme';
import ThemeModeProvider, { ThemeModeContext } from './ThemeModeProvider';
import App from './App';
import ManualReviewDashboard from './pages/ManualReviewDashboard';
import ClientManualMatchDashboard from './pages/ClientManualMatchDashboard';

/**
 * Router Configuration - FIXED
 *
 * FIX 1: Changed formType → claimType in route parameter
 *
 * Routes:
 * 1. / → Redirects to /manual-review
 * 2. /manual-review → Manual Review Dashboard (Phase 1)
 * 3. /claim/:claimId → Client Manual Match Dashboard (direct claim access)
 * 4. /claim/:category/:claimType/next → Queue-based claim access (FIXED: claimType)
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // Default route - redirect to manual-review
      {
        index: true,
        element: <Navigate to='/manual-review' replace />,
      },

      // Manual Review Dashboard (Phase 1)
      {
        path: 'manual-review',
        element: <ManualReviewDashboard />,
      },

      // Client Manual Match Dashboard - Direct claim access (Phase 2)
      // Example: /claim/272120489
      {
        path: 'claim/:claimId',
        element: <ClientManualMatchDashboard />,
      },

      // Client Manual Match Dashboard - Queue-based access (Phase 2)
      // FIX 1: Changed :formType to :claimType
      // Example: /claim/manual-review/hcfa/next?stream=HEOS
      {
        path: 'claim/:category/:claimType/next',
        element: <ClientManualMatchDashboard />,
      },

      // Fallback for unknown routes
      {
        path: '*',
        element: <Navigate to='/manual-review' replace />,
      },
    ],
  },
]);

/**
 * Inner component that consumes theme mode and creates dynamic theme
 * This is an internal component, not exported, so we disable the fast refresh rule
 */
// eslint-disable-next-line react-refresh/only-export-components
function ThemedApp() {
  const context = useContext(ThemeModeContext);
  const mode = context?.mode || 'light';

  // Create theme dynamically based on current mode
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  </React.StrictMode>
);

/**
 * ROUTING FLOW:
 *
 * 1. User lands on / → Redirects to /manual-review
 *
 * 2. User searches for claim "272120489" in Manual Review Dashboard
 *    → API search succeeds
 *    → Navigate to /claim/272120489
 *    → ClientManualMatchDashboard loads claim by ID
 *
 * 3. User clicks on count in Claims Table (e.g., HEOS HCFA: 1)
 *    → ClaimsTable navigates to /claim/manual-review/hcfa/next?stream=HEOS
 *    → ClientManualMatchDashboard gets next claim from queue
 *    → Replaces URL with /claim/{claimNumber}
 *
 * 4. Back navigation handled by browser (no back button in UI now)
 */
