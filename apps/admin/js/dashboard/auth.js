// public/js/auth.js – minimal placeholder

export async function requireRole(role) {
  // Replace this with real Supabase auth logic later
  const sessionStr = localStorage.getItem('supabase.auth.token');
  const session = sessionStr ? JSON.parse(sessionStr) : null;
  const user = session?.currentSession?.user;

  if (!user) {
    window.location.href = '/apps/auth/login.html';
    return null;
  }
  return { user };
}
