// src/main.tsx
import React, { useMemo, useContext, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from './theme';
import ThemeModeProvider, { ThemeModeContext } from './ThemeModeProvider';
import App from './App';
import ManualReviewDashboard from './pages/ManualReviewDashboard';
import ClientManualMatchDashboard from './pages/ClientManualMatchDashboard';
import SecuredRoute from './components/SecuredRoute';
import type { QueueContext } from './components/ClaimsTable/ClaimsTable';
import type { HaltedClaim } from './types/claims';
import type { UserContext } from './types/auth';

/**
 * Placeholder UserContext for the standalone app.
 *
 * Unlike Chassis (which decodes a real Okta JWT via getUserContext()), this
 * app has no existing auth/user-context source today. This mirrors the same
 * stand-in Chassis used before its real auth was wired up
 * (isUserHasClientMatchViewAccess: true) — replace with a real source when
 * this app has one; SecuredRoute itself needs no changes to support that.
 */
const DEFAULT_USER_CONTEXT: UserContext = {
  isUserHasClientMatchViewAccess: true,
  userId: 'unknown user',
};

/**
 * Route wrapper components.
 *
 * ManualReviewDashboard and ClientManualMatchDashboard no longer import
 * react-router at all — they're fully prop-driven so they can be reused by
 * hosts with a different router (e.g. Chassis/Next.js). These two wrapper
 * components own the actual useNavigate()/useLocation() calls instead.
 *
 * This is always safe: a route's `element` is guaranteed to render inside
 * <RouterProvider>, so calling these hooks here is unconditional and
 * lint-clean — no useInRouterContext guard needed, because these wrappers
 * are never rendered anywhere else.
 */

function ManualReviewRoute() {
  const navigate = useNavigate();

  const handleClaimFound = useCallback(
    (claim: HaltedClaim, queueContext?: QueueContext) => {
      void navigate(`/claim/${claim.claimNumber}`, {
        state: { claim, queueContext },
      });
    },
    [navigate]
  );

  return <ManualReviewDashboard onClaimFound={handleClaimFound} />;
}

function ClientMatchRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    claim?: HaltedClaim;
    queueContext?: QueueContext;
  } | null;

  const handleNavigateBack = useCallback(() => {
    void navigate('/manual-review');
  }, [navigate]);

  return (
    <SecuredRoute
      userContext={DEFAULT_USER_CONTEXT}
      requiredPermission='isUserHasClientMatchViewAccess'
    >
      <ClientManualMatchDashboard
        claim={state?.claim}
        queueContext={state?.queueContext}
        onNavigateBack={handleNavigateBack}
      />
    </SecuredRoute>
  );
}

/**
 * Router Configuration
 *
 * basename MUST match vite.config.ts `base: '/ucp-client-match-ui'`.
 * Without it, navigate('/claim/...') targets the server root ('/claim/...')
 * instead of '/ucp-client-match-ui/claim/...', causing silent navigation
 * failures in the deployed environment.
 *
 * Routes:
 * 1. /                               → /manual-review (redirect)
 * 2. /manual-review                  → ManualReviewDashboard
 * 3. /claim/:claimId                 → ClientManualMatchDashboard (search result)
 * 4. /claim/:category/:claimType/next→ ClientManualMatchDashboard (queue)
 *    Examples:
 *      /claim/manual-review/hcfa/next?stream=HEOS
 *      /claim/manual-review/ub/next?stream=PHCS
 *      /claim/manual-review/all/next?stream=HEOS
 *      /claim/manual-pended/hcfa/next?stream=HEOS
 */
const router = createBrowserRouter(
  [
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
          element: <ManualReviewRoute />,
        },
        // Direct claim access via search result (state carries HaltedClaim)
        {
          path: 'claim/:claimId',
          element: <ClientMatchRoute />,
        },
        {
          path: '*',
          element: <Navigate to='/manual-review' replace />,
        },
      ],
    },
  ],
  {
    // Must match vite.config.ts `base` and the nginx serving path.
    // In Docker/OKE: app is served at /ucp-client-match-ui/
    // navigate('/claim/...') resolves to /ucp-client-match-ui/claim/...
    basename: '/ucp-client-match-ui',
  }
);

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
