import { supabase } from '/js/supabase.js';

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

async function init() {
  try {
    // prevent double init (important in SPA scenarios)
    if (isBooted) return;
    isBooted = true;

    // 1. AUTH
    const auth = await requireRole('admin');
    if (!auth) return;

    // 2. CORE BOOT
    UI.cacheElements();
    UI.initOfflineAwareness();

    checkPermissions(auth.user.role);
    initCommandPalette();

    // 3. RENDERERS
    initOperationsRenderer();
    initQueueRenderer();
    initRevenueRenderer();

    // 4. DATA LOAD (critical system step)
    await loadDashboardData();

    // 5. REALTIME
    realtimeChannel = setupTargetedRealtime();

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
 * Full system cleanup (important for SPA safety)
 */
function cleanup() {
  try {
    // realtime cleanup
    teardownRealtime();

    // supabase channel safety fallback
    if (realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    // UI cleanup (if implemented)
    UI.destroy?.();

  } catch (err) {
    console.warn('Dashboard cleanup issue:', err);
  }
}

// SPA safety (not just page unload)
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

init();
