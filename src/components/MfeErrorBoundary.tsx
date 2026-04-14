// CLAIMS-SUM (Host)
// src/components/MfeErrorBoundary.tsx
// ============================================================================
// MFE ERROR BOUNDARY
//
// Catches failures that <Suspense> cannot handle:
//   - MFE bundle failed to load (server down, network error, bad chunk)
//   - MFE loaded but threw during render
//
// Usage — wrap every <Suspense> that loads a remote MFE:
//
//   <MfeErrorBoundary mfeName="Member Search">
//     <Suspense fallback={<MfeLoadingFallback />}>
//       <RemoteWidget ... />
//     </Suspense>
//   </MfeErrorBoundary>
//
// Design decisions:
//   - Class component: required by React — error boundaries must use
//     getDerivedStateFromError / componentDidCatch lifecycle methods.
//     There is no hook equivalent in React as of v18.
//   - Retry button resets state, which unmounts and remounts children,
//     triggering the lazy() import to attempt again.
//   - componentDidCatch logs to console.error — in production this would
//     be replaced with a monitoring call (e.g. Sentry.captureException).
//   - mfeName prop gives the user a specific, actionable error message
//     rather than a generic "something went wrong".
// ============================================================================

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

// ============================================================================
// Props & State
// ============================================================================
interface MfeErrorBoundaryProps {
  /**
   * Human-readable name of the MFE shown in the error message.
   * e.g. "Member Search", "Employer Group Search"
   */
  mfeName: string;
  children: ReactNode;
}

interface MfeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// Component
// ============================================================================
export class MfeErrorBoundary extends Component<
  MfeErrorBoundaryProps,
  MfeErrorBoundaryState
> {
  constructor(props: MfeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Triggered during render — updates state so the next render shows the UI.
  static getDerivedStateFromError(error: Error): MfeErrorBoundaryState {
    return { hasError: true, error };
  }

  // Triggered after render — side effects only (logging, monitoring).
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production: replace with monitoring service (e.g. Sentry.captureException)
    console.error(
      `[MfeErrorBoundary] ${this.props.mfeName} failed to load.`,
      error,
      info.componentStack
    );
  }

  // Arrow function class field — lexically bound to the instance.
  // Satisfies @typescript-eslint/unbound-method: no .bind(this) needed,
  // `this` is always the class instance regardless of how it is called.
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          p: 3,
        }}
      >
        <Alert
          severity='error'
          sx={{ maxWidth: 560, width: '100%' }}
          action={
            <Button
              color='error'
              size='small'
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Retry
            </Button>
          }
        >
          <AlertTitle>{this.props.mfeName} Unavailable</AlertTitle>
          The {this.props.mfeName} service could not be loaded. Please retry or
          contact support if the issue persists.
        </Alert>
      </Box>
    );
  }
}
