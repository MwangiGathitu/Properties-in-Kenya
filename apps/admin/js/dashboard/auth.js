// public/js/auth.js
import { supabase } from './supabase.js';

export async function requireRole(role) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = '/apps/auth/login.html';
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    await supabase.auth.signOut();
    window.location.href = '/apps/auth/login.html';
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== role) {
    window.location.href = '/apps/auth/login.html';
    return null;
  }

  return { user, role: profile.role, profile };
}
