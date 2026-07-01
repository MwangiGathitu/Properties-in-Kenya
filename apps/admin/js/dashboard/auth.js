// js/auth.js
export async function requireRole(role) {
  // TODO: real auth logic
  const session = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
  const user = session?.currentSession?.user;
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return { user };
}
