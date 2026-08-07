// public/js/auth.js
import { supabase } from './supabase.js';

// Centralized base path for redirects to support subdirectory deployments
const BASE_PATH = window.__APP_BASE_PATH__ || '';

let currentUser = null;
let currentRole = null;
let currentUserId = null;
let isInitialized = false;
let initPromise = null; // Prevents race conditions on concurrent init calls
let authSubscription = null; // For cleanup

/**
 * 1. Initialize the session when the app first loads.
 * Call this ONCE in your main app entry point (e.g., app.js or main.js).
 */
export async function initAuth() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // FIXED: Use getUser() instead of getSession() to verify token with server
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        currentUser = null;
        currentRole = null;
        currentUserId = null;
      } else {
        await handleSession(user);
      }

      // Listen for auth changes
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await handleSession(session.user);
        } else {
          currentUser = null;
          currentRole = null;
          currentUserId = null;
        }
      });
      authSubscription = data.subscription;
      
      isInitialized = true;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Internal function to process the session and fetch the role from the DB.
 */
async function handleSession(user) {
  if (!user) return;

  currentUser = user;

  // FIXED: Only fetch if user changed OR if we don't have a role yet (e.g. previous fetch failed)
  if (!currentRole || currentUserId !== user.id) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !profile) {
      console.error('Error fetching profile role:', error);
      // FIXED: Do NOT set currentUserId if fetch fails, so it retries next time
      // Leave currentRole null so requireRole handles the failure gracefully
      currentRole = null; 
      return;
    }

    currentUserId = user.id;
    currentRole = profile.role || 'buyer';
  }
}

/**
 * 2. The requireRole function.
 * 
 * @param {string|string[]} allowedRoles - e.g., 'admin' or ['admin', 'moderator']
 */
export async function requireRole(allowedRoles = []) {
  if (!isInitialized) {
    await initAuth();
  }

  if (!currentUser) {
    window.location.href = `${BASE_PATH}/login`;
    return null;
  }

  // FIXED: If role failed to fetch due to network error, treat as unauthorized to prevent bypass
  if (!currentRole) {
     console.warn('User role could not be verified. Redirecting to login.');
     window.location.href = `${BASE_PATH}/login`;
     return null;
  }

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (rolesArray.length > 0 && !rolesArray.includes(currentRole)) {
    console.warn(`Access denied. User role '${currentRole}' not in allowed roles:`, rolesArray);
    
    if (currentRole === 'admin') {
      window.location.href = `${BASE_PATH}/admin`; 
    } else if (currentRole === 'agent') {
      window.location.href = `${BASE_PATH}/mission-control`; 
    } else {
      window.location.href = `${BASE_PATH}/`; 
    }
    return null;
  }

  return { user: currentUser, role: currentRole };
}

/**
 * 3. Helper to get the current user/role without forcing a redirect.
 */
export function getCurrentAuth() {
  return { user: currentUser, role: currentRole };
}

/**
 * 4. Clean logout function.
 */
export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Logout network error:', err);
  } finally {
    // FIXED: Cleanup subscription to prevent memory leaks
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
    currentUser = null;
    currentRole = null;
    currentUserId = null;
    isInitialized = false;
    window.location.href = `${BASE_PATH}/login`;
  }
}
