// src/main.tsx
import React, { useMemo, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from './theme';
import ThemeModeProvider, { ThemeModeContext } from './ThemeModeProvider';
import App from './App';
import ManualReviewDashboard from './pages/ManualReviewDashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [{ index: true, element: <ManualReviewDashboard /> }],
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
