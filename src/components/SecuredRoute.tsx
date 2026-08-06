import React from 'react';
import type { SecuredRouteProps } from '../types/auth';
import { useAccessControl } from '../hooks/useAccessControl';

/**
 * SecuredRoute — gates children behind a UserContext permission check.
 *
 * Usage (in Dashboard, wrapping the Add/Edit button):
 *   <SecuredRoute userContext={userContext}>
 *     <Button onClick={handleAddEditMember}>Add / Edit Member</Button>
 *   </SecuredRoute>
 *
 * Renders `fallback` (default: null) when:
 *   - No userContext is available, OR
 *   - The required permission key resolves to falsy
 */
export const SecuredRoute: React.FC<SecuredRouteProps> = ({
  userContext,
  children,
  fallback = null,
  requiredPermission = 'isUserHasClientMatchViewAccess',
}) => {
  const { userContext: resolvedContext } = useAccessControl(userContext);

  if (!resolvedContext) {
    return <>{fallback}</>;
  }

  const hasPermission = Boolean(resolvedContext[requiredPermission]);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default SecuredRoute;
