// src/index.ts
// public API for the npm package — only add things here that a consumer actually needs

// full dashboard UX — what chassis uses
export { default as ClaimsSearch } from './pages/ClaimsSearch';
export { default as ClientManualMatchDashboard } from './pages/ClientManualMatchDashboard';
export { default as ManualReviewDashboard } from './pages/ManualReviewDashboard';

export { default as ThemeModeProvider } from './ThemeModeProvider';

// auth — chassis needs these to pass userContext and set up SecuredRoute
export type { UserContext, SecuredRouteProps } from './types/auth';
export { default as SecuredRoute } from './components/SecuredRoute';

// service setup — chassis calls this once on startup with the API base URL
export { configureClaimsService, claimsApi } from './services/claimsApi';

// chassis's claim/[claimNumber] route fetches a claim by ID directly
// (same call ManualReviewDashboard's search flow already uses) and must
// convert the raw API response the same way this package does internally.
export { adaptHaltedClaimResponse } from './utils/claimAdapters';

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
  HaltedClaim,
} from './types/claims';

// QueueContext — used by ClaimsTable's onClaimReady / ManualReviewDashboard's
// onClaimFound / ClientManualMatchDashboard's queueContext prop. Defined in
// ClaimsTable since that's where it originates (queue filter selection),
// re-exported here since chassis needs it to type its own callbacks.
export type { QueueContext } from './components/ClaimsTable/ClaimsTable';
