// src/index.ts
// public API for the npm package — only add things here that a consumer actually needs

// full dashboard UX — what chassis uses
export { default as ClaimsSearch } from './pages/ClaimsSearch';
export { default as ClientManualMatchDashboard } from './pages/ClientManualMatchDashboard';
export { default as ManualReviewDashboard } from './pages/ManualReviewDashboard';

export { default as ThemeModedProvider } from './ThemeModeProvider';

// auth — chassis needs these to pass userContext and set up SecuredRoute
export type { UserContext, SecuredRouteProps } from './types/auth';
export { default as SecuredRoute } from './components/SecuredRoute';

// service setup — chassis calls this once on startup with the API base URL
export { configureClaimsService } from './services/claimsApi';

// types chassis needs to type its own callbacks
export type {
  ClaimsResponse,
  DenialReason,
  NextHaltedClaimRequest,
  HaltedClaimApiResponse,
  PendClaimRequest,
  DenyDecisionRequest,
  ClaimActionResponse,
  UpdateCcodeRequest,
  UpdateCcodeResult,
  UpdateCcodeAlertResponse,
} from './types/claims';
