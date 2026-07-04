const ROLE_CAPABILITIES = {
  // FIX: Added the 'admin' role. 
  // Without this, your admin dashboard would load but show zero UI elements.
  admin: ['*'], 
  super_admin: ['*'],
  moderator: ['properties', 'moderation', 'corrections', 'messages'],
  support: ['users', 'messages', 'activity'],
  finance: ['payments', 'revenue', 'analytics'],
  analytics: ['analytics', 'activity'],
  
  // Optional: Add default roles so they don't break if they accidentally hit this file
  agent: ['properties', 'messages'], 
  buyer: [] 
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

// The function that dashboard.js expects
export function checkPermissions(role) {
  setRole(role);
}
