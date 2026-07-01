// FIXED IMPORTS – correct relative paths from apps/admin/
import { supabase } from '/public/shared/js/supabase.js';   // absolute – file in public/shared/js/
import { requireRole } from './js/dashboard/auth.js';       // relative from apps/admin/

// Dashboard modules – inside apps/admin/js/dashboard/
import { UI } from './js/dashboard/ui.js';
import { loadDashboardData } from './js/dashboard/api.js';
import { setupTargetedRealtime, teardownRealtime } from './js/dashboard/realtime.js';
import { checkPermissions } from './js/dashboard/permissions.js';
import { initCommandPalette } from './js/dashboard/command.js';

// Renderers – inside apps/admin/js/dashboard/render/
import { initOperationsRenderer } from './js/dashboard/render/operations.js';
import { initQueueRenderer } from './js/dashboard/render/queue.js';
import { initRevenueRenderer } from './js/dashboard/render/revenue.js';

let realtimeChannel = null;
let isBooted = false;

async function init() {
  try {
    if (isBooted) return;
    isBooted = true;

    const auth = await requireRole('admin');
    if (!auth) return;

    UI.cacheElements();
    UI.initOfflineAwareness();
    checkPermissions(auth.user.role);
    initCommandPalette();

    initOperationsRenderer();
    initQueueRenderer();
    initRevenueRenderer();

    await loadDashboardData();

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

function cleanup() {
  try {
    teardownRealtime();
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

init();
