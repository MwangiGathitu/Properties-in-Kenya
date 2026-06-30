// apps/admin/dashboard.js
import { requireRole } from '/js/auth.js';
import { UI } from '/js/dashboard/ui.js';
import { loadDashboardData } from '/js/dashboard/api.js';
import { setupTargetedRealtime } from '/js/dashboard/realtime.js';
import { checkPermissions } from '/js/dashboard/permissions.js';

// Import Renderers
import { initStatsRenderer } from '/js/dashboard/render/stats.js';
import { initOperationsRenderer } from '/js/dashboard/render/operations.js';
import { initQueueRenderer } from '/js/dashboard/render/queue.js';
// ... other renderers

async function init() {
  const auth = await requireRole('admin');
  if (!auth) return;

  // 1. Boot Core Systems
  UI.cacheElements();
  UI.initOfflineAwareness();
  checkPermissions(auth.user.role); // 13. Granular permissions

  // 2. Initialize Renderers (They subscribe to the Store)
  initStatsRenderer();
  initOperationsRenderer();
  initQueueRenderer();

  // 3. Initial Parallel Data Load
  await loadDashboardData();

  // 4. Start Targeted Realtime
  const channel = setupTargetedRealtime();
  window.addEventListener('beforeunload', () => supabase.removeChannel(channel));
}

init();
