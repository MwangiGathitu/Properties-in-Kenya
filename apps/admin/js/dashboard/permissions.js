const ROLE_CAPABILITIES = {
  super_admin: ['*'],
  moderator: ['properties', 'moderation', 'corrections', 'messages'],
  support: ['users', 'messages', 'activity'],
  finance: ['payments', 'revenue', 'analytics'],
  analytics: ['analytics', 'activity']
};

let currentUserRole = 'viewer';

export function setRole(role) {
  currentUserRole = role || 'viewer';
}

export function getRole() {
  return currentUserRole;
}

export function hasPermission(module) {
  const caps = ROLE_CAPABILITIES[currentUserRole] || [];
  return caps.includes('*') || caps.includes(module);
}

// NEW: The missing function that dashboard.js expects
export function checkPermissions(role) {
  setRole(role);
  // You can add further checks here later if needed
}
