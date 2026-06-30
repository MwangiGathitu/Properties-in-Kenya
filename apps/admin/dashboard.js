// apps/admin/dashboard.js
import { supabase } from '/js/supabase.js';

import { requireRole, logout } from '/js/auth.js';
import { UI } from '/js/dashboard/ui.js';
import { loadDashboardData } from '/js/dashboard/api.js';
import { setupTargetedRealtime } from '/js/dashboard/realtime.js';
import { checkPermissions } from '/js/dashboard/permissions.js';

// Renderers
import { initStatsRenderer } from '/js/dashboard/render/stats.js';
import { initOperationsRenderer } from '/js/dashboard/render/operations.js';
import { initQueueRenderer } from '/js/dashboard/render/queue.js';

async function init() {
  try {
    // 1. AUTH GATE
    const auth = await requireRole('admin');

    if (!auth) {
      UI.showError('Access denied');
      await logout();
      return;
    }

    // 2. BOOT CORE SYSTEMS
    UI.cacheElements();
    UI.initOfflineAwareness();
    checkPermissions(auth.user.role);

    // 3. INIT RENDERERS (store subscribers)
    initStatsRenderer();
    initOperationsRenderer();
    initQueueRenderer();

    // 4. LOAD DATA (parallel)
    await loadDashboardData();

    // 5. REALTIME (safe init)
    const channel = setupTargetedRealtime();

    if (channel) {
      window.addEventListener('beforeunload', () => {
        supabase.removeChannel(channel);
      });
    }

  } catch (error) {
    console.error('Dashboard init failed:', error);
    UI.showError('System failed to initialize');
  }
}

init();
