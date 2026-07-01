import { supabase } from '/shared/js/supabase.js';
import { requireRole } from '/js/auth.js';
import { UI } from '/js/dashboard/ui.js';
import { loadDashboardData } from '/js/dashboard/api.js';
import { setupTargetedRealtime, teardownRealtime } from '/js/dashboard/realtime.js';
import { checkPermissions } from '/js/dashboard/permissions.js';
import { initCommandPalette } from '/js/dashboard/command.js';

// Renderers
import { initOperationsRenderer } from '/js/dashboard/render/operations.js';
import { initQueueRenderer } from '/js/dashboard/render/queue.js';
import { initRevenueRenderer } from '/js/dashboard/render/revenue.js';

let realtimeChannel = null;
let isBooted = false;
let isCleaningUp = false;

/**
 * MAIN BOOTSTRAP
 */
async function init() {
  try {
    // Prevent double boot (SPA + reload safety)
    if (isBooted) return;
    isBooted = true;

    // 1. AUTH CHECK
    const auth = await requireRole('admin');
    if (!auth) return;

    // 2. CORE UI INITIALIZATION
    UI.cacheElements();
    UI.initOfflineAwareness();

    checkPermissions(auth.user.role);
    initCommandPalette();

    // 3. RENDER MODULES
    initOperationsRenderer();
    initQueueRenderer();
    initRevenueRenderer();

    // 4. LOAD DATA (critical blocking step)
    await loadDashboardData();

    // 5. REALTIME SYSTEM
    realtimeChannel = setupTargetedRealtime();

    console.log('Dashboard successfully initialized');
  } catch (error) {
    console.error('Dashboard init failed:', error);

    UI.showErrorState(
      'globalLoading',
      'System failed to initialize. Please refresh.',
      () => window.location.reload()
    );
  }
}

/**
 * SAFE CLEANUP (PREVENT MEMORY LEAKS + DUPLICATE CHANNELS)
 */
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  try {
    teardownRealtime();

    if (realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    UI.destroy?.();

    console.log('Dashboard cleanup completed');
  } catch (err) {
    console.warn('Dashboard cleanup issue:', err);
  }
}

/**
 * SAFE EXIT HANDLERS
 */
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

/**
 * BOOT APPLICATION
 */
init();
