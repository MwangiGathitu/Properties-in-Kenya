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
