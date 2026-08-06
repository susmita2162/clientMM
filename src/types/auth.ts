/**
 * User context and authentication types.
 * Decoupled from Okta — the wrapper (NextJS shell) decodes the token
 * and passes structured UserContext as a prop to MemberSearchWidget.
 */
export interface UserContext {
  /**
   * Admin access — grants Add / Edit member capability.
   * Edit implies View (an Edit user always has View access too).
   * Computed and passed by the NextJS wrapper after decoding the Okta JWT.
   */
  /**
   * View access — grants dashboard view and search capability.
   * True for all authenticated users, including Admins.
   * Computed and passed by the NextJS wrapper after decoding the Okta JWT.
   */
  isUserHasClientMatchViewAccess: boolean;
  /**
   * User identifier from Okta.
   */
  userId?: string;
  /**
   * Additional custom attributes forwarded from the wrapper.
   */
  [key: string]: unknown;
}

export interface SecuredRouteProps {
  /**
   * User context with access information passed from the wrapper.
   */
  userContext?: UserContext;
  /**
   * Component to render if access is granted.
   */
  children: React.ReactNode;
  /**
   * Component to render if access is denied. Defaults to null.
   */
  fallback?: React.ReactNode;
  /**
   * The UserContext key to check for access. Defaults to
   * "isUserHasMemberSearchEditAccess" which gates Add / Edit member.
   */
  requiredPermission?: keyof UserContext;
}
