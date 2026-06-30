// apps/admin/dashboard.js
import { supabase } from '/js/supabase.js';

import { requireRole } from '/js/auth.js';
import { UI } from '/js/dashboard/ui.js';
import { loadDashboardData } from '/js/dashboard/api.js';
import { setupTargetedRealtime } from '/js/dashboard/realtime.js';
import { checkPermissions } from '/js/dashboard/permissions.js';
import { initCommandPalette } from '/js/dashboard/command.js';

// Renderers
import { initOperationsRenderer } from '/js/dashboard/render/operations.js';
import { initQueueRenderer } from '/js/dashboard/render/queue.js';
import { initRevenueRenderer } from '/js/dashboard/render/revenue.js';

let realtimeChannel = null;

async function init() {
  try {
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

    // 4. DATA LOAD
    await loadDashboardData();

    // 5. REALTIME
    realtimeChannel = setupTargetedRealtime();

  } catch (error) {
    console.error('Dashboard init failed:', error);
    UI.showError('System initialization failed');
  }
}

// Safe cleanup handler (prevents crashes)
function cleanup() {
  if (realtimeChannel && supabase) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch (err) {
      console.warn('Realtime cleanup failed:', err);
    }
  }
}

window.addEventListener('beforeunload', cleanup);

init();
