// js/dashboard/permissions.js
import { UI } from './ui.js';

// Define what each role is allowed to access
const ROLE_CAPABILITIES = {
  super_admin: ['*'], // Wildcard for full access
  moderator: ['properties', 'moderation', 'corrections', 'messages'],
  support: ['users', 'messages', 'activity'],
  finance: ['payments', 'revenue', 'analytics'],
  analytics: ['analytics', 'activity']
};

let currentUserRole = 'viewer';

export function setRole(role) {
  currentUserRole = role || 'viewer';
}

export function hasPermission(module) {
  const caps = ROLE_CAPABILITIES[currentUserRole] || [];
  return caps.includes('*') || caps.includes(module);
}

// Run this on boot to hide restricted UI elements
export function checkPermissions(role) {
  setRole(role);
  
  // Map modules to their DOM container IDs
  const moduleMap = {
    revenue: ['revenueContainer', 'kpiRevenue'],
    users: ['usersContainer', 'kpiAgents', 'kpiBuyers'],
    properties: ['propertiesContainer', 'kpiProperties'],
    moderation: ['queueContainer', 'kpiPendingReviews']
  };

  Object.entries(moduleMap).forEach(([module, ids]) => {
    if (!hasPermission(module)) {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          // Find the closest card/widget wrapper and hide it
          const wrapper = el.closest('.card, .kpi-card, .widget, .grid-item');
          if (wrapper) wrapper.style.display = 'none';
          else el.style.display = 'none';
        }
      });
    }
  });
}
