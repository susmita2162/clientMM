/**
 * Hook for managing user access and roles.
 * Decoupled from Okta — accepts UserContext as a prop or via context.
 *
 * FIX: Removed conditional useContext call (Rules of Hooks violation).
 * useContext is now always called; the prop simply takes precedence over
 * the context value when both are present.
 */
import { useContext, createContext, type ReactNode } from 'react';
import type { UserContext } from '../types/auth';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UserAccessContext = createContext<UserContext | undefined>(undefined);

/**
 * Provider for wrapping sub-trees that need access to UserContext without
 * prop-drilling. The NextJS wrapper can also use this if it opts for
 * context-based injection instead of direct props.
 */
export const UserAccessProvider = ({
  children,
  userContext,
}: {
  children: ReactNode;
  userContext: UserContext;
}) => (
  <UserAccessContext.Provider value={userContext}>
    {children}
  </UserAccessContext.Provider>
);

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Strict hook — throws if used outside UserAccessProvider.
 * Use in deeply nested components that are always rendered inside the provider.
 */
export const useUserContext = (): UserContext => {
  const context = useContext(UserAccessContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserAccessProvider');
  }
  return context;
};

/**
 * Flexible hook — prop takes precedence over context.
 * Safe to call from any component whether or not a provider is present.
 *
 * Resolution order:
 *   1. userContext prop (passed directly, e.g. from GroupSearchWidget)
 *   2. UserAccessContext (provided by UserAccessProvider higher in the tree)
 *   3. undefined → all permission flags default to false
 */
export const useAccessControl = (userContext?: UserContext) => {
  // ✅ Always call useContext — never conditionally.
  // The prop simply wins when both are present.
  const contextValue = useContext(UserAccessContext);
  const resolved = userContext ?? contextValue;

  // Both flags are pre-computed by the NextJS wrapper after decoding the
  // Okta JWT — no role-string matching needed on our side.
  const isUserHasClientMatchViewAccess =
    resolved?.isUserHasClientMatchViewAccess ?? false;

  return {
    isUserHasClientMatchViewAccess,
    userContext: resolved,
  };
};

export default useAccessControl;
