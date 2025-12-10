import { ROLE_PERMISSIONS } from "./roles";

/**
 * Check if a user role has a specific permission
 */
export const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (role, permissionsArray) => {
  return permissionsArray.some((permission) => hasPermission(role, permission));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (role, permissionsArray) => {
  return permissionsArray.every((permission) =>
    hasPermission(role, permission)
  );
};
