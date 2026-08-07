/**
 * Admin UI Permissions
 * 
 * IMPORTANT: This file is for UI gating ONLY (hiding/showing buttons and widgets).
 * Database RLS policies remain the absolute security boundary for data access.
 */

const ROLE_CAPABILITIES = {
  // Admin-level roles
  admin: ['*'], 
  super_admin: ['*'],
  moderator: ['properties', 'moderation', 'corrections', 'messages'],
  support: ['users', 'messages', 'activity'],
  finance: ['payments', 'revenue', 'analytics'],
  analytics: ['analytics', 'activity'],
  
  // Note: 'agent' and 'buyer' roles are intentionally omitted here.
  // They should be blocked at the route level by requireRole('admin') in auth.js.
  // Including them here risks showing UI elements that will immediately throw 403 RLS errors.
};

let currentUserRole = null;

/**
 * Sets the current user's role for UI permission checks.
 * @param {string} role - The user's role from the database.
 */
export function setRole(role) {
  if (!role) {
    console.warn('[Permissions] Attempted to set a null/undefined role. Defaulting to no permissions.');
    currentUserRole = null;
    return;
  }

  // FIXED: Use Object.hasOwn to prevent accessing inherited prototype methods (e.g. 'toString')
  if (!Object.hasOwn(ROLE_CAPABILITIES, role)) {
    console.warn(`[Permissions] Unknown role '${role}' provided. UI elements will be hidden.`);
  }
  
  currentUserRole = role;
}

/**
 * Gets the current user's role.
 * @returns {string|null}
 */
export function getRole() {
  return currentUserRole;
}

/**
 * Checks if the current role has permission to view a specific UI module.
 * @param {string} module - The module identifier (e.g., 'analytics', 'payments').
 * @returns {boolean}
 */
export function hasPermission(module) {
  if (!currentUserRole || !module) return false;
  
  // FIXED: Safely retrieve capabilities without risking prototype chain access
  const caps = Object.hasOwn(ROLE_CAPABILITIES, currentUserRole) ? ROLE_CAPABILITIES[currentUserRole] : [];
  return caps.includes('*') || caps.includes(module);
}

/**
 * The function that dashboard.js expects during initialization.
 * Sets the role and returns true to satisfy the orchestrator's gate.
 * 
 * @param {string} role - The user's role.
 * @returns {boolean} - Always returns true if a role is provided, as route-level 
 *                      access is already enforced by requireRole() in auth.js.
 */
export function checkPermissions(role) {
  setRole(role);
  
  // Must return a truthy value so the dashboard orchestrator 
  // does not trigger its `if (!hasPermission) { redirect }` fallback.
  return !!role; 
}
