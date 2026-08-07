// public/js/auth.js
import { supabase } from './supabase.js';

// In-memory cache so we don't hit the database on every single route change
let currentUser = null;
let currentRole = null;
let isInitialized = false;

/**
 * 1. Initialize the session when the app first loads.
 * Call this ONCE in your main app entry point (e.g., app.js or main.js).
 */
export async function initAuth() {
  // Get the initial session securely from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  await handleSession(session);

  // Listen for auth changes (login, logout, token refresh)
  supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleSession(session);
  });
  
  isInitialized = true;
}

/**
 * Internal function to process the session and fetch the role from the DB.
 */
async function handleSession(session) {
  if (session?.user) {
    currentUser = session.user;
    
    // Fetch role from the Single Source of Truth: the profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();
      
    if (error) console.error('Error fetching profile role:', error);
    
    // Default to 'buyer' if no profile exists yet
    currentRole = profile?.role || 'buyer'; 
  } else {
    currentUser = null;
    currentRole = null;
  }
}

/**
 * 2. The NEW, REAL requireRole function.
 * Replaces the broken placeholder.
 * 
 * @param {string|string[]} allowedRoles - e.g., 'admin' or ['admin', 'moderator']
 */
export async function requireRole(allowedRoles = []) {
  // Ensure auth is initialized before checking
  if (!isInitialized) {
    await initAuth();
  }

  // If no user is logged in, kick to login
  if (!currentUser) {
    window.location.href = '/apps/auth/login.html';
    return null;
  }

  // Normalize allowedRoles to an array
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // If roles are specified, check if the user's DB role matches
  if (rolesArray.length > 0 && !rolesArray.includes(currentRole)) {
    console.warn(`Access denied. User role '${currentRole}' not in allowed roles:`, rolesArray);
    
    // Smart redirect: Send them to their actual dashboard instead of a dead end
    if (currentRole === 'admin') {
      window.location.href = '/admin/dashboard.html'; // Update path to match your actual admin route
    } else if (currentRole === 'agent') {
      window.location.href = '/agent/dashboard.html'; // Update path to match your actual agent route
    } else {
      window.location.href = '/'; // Default fallback
    }
    return null;
  }

  // All clear! Return the user and their verified role.
  return { user: currentUser, role: currentRole };
}

/**
 * 3. Helper to get the current user/role without forcing a redirect.
 * Useful for UI elements (like showing/hiding the Admin button).
 */
export function getCurrentAuth() {
  return { user: currentUser, role: currentRole };
}

/**
 * 4. Clean logout function.
 */
export async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentRole = null;
  window.location.href = '/apps/auth/login.html';
}
