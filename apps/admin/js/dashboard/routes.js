// js/dashboard/routes.js

export const ROUTES = {
  dashboard: '/admin/dashboard',

  // Core modules
  properties: '/admin/properties',
  newProperty: '/admin/properties/new',

  users: '/admin/users',
  newAgent: '/admin/users/new',

  payments: '/admin/payments',

  moderation: '/admin/moderation',

  analytics: '/admin/analytics',

  broadcasts: '/admin/broadcasts',

  settings: '/admin/settings',

  activity: '/admin/activity'
};

/**
 * Safe route builder for dynamic navigation
 */
export function buildRoute(base, params = {}) {
  const url = new URL(base, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return url.pathname + url.search;
}
