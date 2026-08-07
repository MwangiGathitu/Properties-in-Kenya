// FIXED IMPORTS – Standard root-relative paths. 
// NOTE: If deploying to a subdirectory, you MUST use an <script type="importmap"> in your HTML 
// to remap '/js/' to your base path, or use a bundler. Static imports cannot use runtime variables.
import { supabase } from '/js/supabase.js';          
import { requireRole } from '/js/auth.js';                   

// Local dashboard modules (same folder)
import { UI } from './ui.js';
import { loadDashboardData } from './api.js';
import { setupTargetedRealtime, teardownRealtime } from './realtime.js';
import { checkPermissions } from './permissions.js';
import { initCommandPalette } from './command.js';

// Renderers
import { initOperationsRenderer } from './render/operations.js';
import { initQueueRenderer } from './render/queue.js';
import { initRevenueRenderer } from './render/revenue.js';

let realtimeChannel = null;
let isBooted = false;
let isRealtimeActive = false; // Guard for bfcache

// FIXED: Centralized base path for redirects to support subdirectory deployments
const BASE_PATH = window.__APP_BASE_PATH__ || ''; 

// FIXED: Helper to add timeouts to promises, with proper cleanup to prevent memory leaks
const withTimeout = (promise, ms, name) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${name} initialization timed out`)), ms);
  });
  
  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId));
};

// FIXED: Safe wrapper to catch synchronous throws in widget initializers
const safeInit = (fn) => Promise.resolve().then(fn);

async function init() {
  try {
    if (isBooted) return;
    isBooted = true;

    // 1. Authentication & Authorization (Do this FIRST)
    const auth = await requireRole('admin');
    if (!auth) {
      window.location.href = `${BASE_PATH}/login`; 
      return;
    }

    // FIXED: Safe role extraction across common Supabase auth object shapes
    const userRole = auth.role || auth.user_metadata?.role || auth.user?.role;
    
    const hasPermission = await Promise.resolve(checkPermissions(userRole));
    if (!hasPermission) {
      console.warn('Insufficient permissions for admin dashboard.');
      const loadingEl = document.getElementById('globalLoading');
      if (loadingEl) {
        loadingEl.innerHTML = '<p style="color: var(--danger); padding: 2rem; text-align: center;">Access Denied. Redirecting...</p>';
      }
      
      const fallbackRoute = userRole === 'agent' ? '/mission-control' : '/';
      window.location.href = `${BASE_PATH}${fallbackRoute}`; 
      return; 
    }
    
    // 2. UI Initialization
    UI.cacheElements();
    UI.initOfflineAwareness();

    // 3. Module Coordination & Widget Loading
    // FIXED: Wrapped in safeInit to catch synchronous throws and isolate them in allSettled
    const widgetResults = await Promise.allSettled([
      safeInit(() => withTimeout(initCommandPalette(), 5000, 'Command Palette')),
      safeInit(() => withTimeout(initOperationsRenderer(), 8000, 'Operations Renderer')),
      safeInit(() => withTimeout(initQueueRenderer(), 8000, 'Queue Renderer')),
      safeInit(() => withTimeout(initRevenueRenderer(), 8000, 'Revenue Renderer'))
    ]);

    widgetResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Widget initialization failed or timed out (index ${index}):`, result.reason);
      }
    });

    // 4. Data Loading
    // FIXED: Added timeout to prevent indefinite hangs on poor networks
    await withTimeout(loadDashboardData(), 10000, 'Dashboard Data');

    // 5. Realtime Initialization
    if (!isRealtimeActive) {
      // FIXED: Added timeout to realtime setup
      realtimeChannel = await withTimeout(setupTargetedRealtime(), 8000, 'Realtime Setup');
      isRealtimeActive = true;
    }
  } catch (error) {
    console.error('Dashboard init failed:', error);
    
    // FIXED: Safely cast error message to string to prevent TypeError crash on missing message property
    const errMsg = String(error?.message || '').toLowerCase();
    const isAuthError = error?.status === 401 || 
                        error?.code === 401 || 
                        errMsg.includes('auth') ||
                        errMsg.includes('unauthorized') ||
                        errMsg.includes('jwt');
                        
    if (isAuthError && supabase) {
      console.warn('Session expired or unauthorized. Clearing session and redirecting to login.');
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // Ignore signout errors
      }
      window.location.href = `${BASE_PATH}/login`;
      return;
    }
    
    const loadingEl = document.getElementById('globalLoading');
    const errorMsg = 'System failed to initialize. Please refresh.';
    
    if (loadingEl) {
      if (typeof UI?.showErrorState === 'function') {
        UI.showErrorState('globalLoading', errorMsg, () => window.location.reload());
      } else {
        loadingEl.innerHTML = `<p style="color: var(--danger); padding: 2rem; text-align: center;">${errorMsg}</p>`;
      }
    }
  }
}

function cleanup() {
  try {
    teardownRealtime();
    isRealtimeActive = false;
    if (realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    UI.destroy?.();
  } catch (err) {
    console.warn('Dashboard cleanup issue:', err);
  }
}

window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

// FIXED: Safe bfcache restoration. 
window.addEventListener('pageshow', async (event) => {
  if (event.persisted) {
    try {
      // Explicitly teardown lingering state/listeners before re-establishing to prevent duplicates
      await teardownRealtime();
      isRealtimeActive = false;
      
      if (supabase && typeof setupTargetedRealtime === 'function' && !isRealtimeActive) {
        realtimeChannel = await setupTargetedRealtime();
        isRealtimeActive = true;
      }
    } catch (err) {
      console.error('bfcache realtime restoration failed:', err);
    }
  }
});

init();
