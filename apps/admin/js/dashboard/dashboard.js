// FIXED IMPORTS – all relative to this file's location (apps/admin/js/dashboard/)
import { supabase } from '/public/js/supabase.js';          
// FIX 1: Import from the GLOBAL auth file, not the local duplicate.
import { requireRole } from '/public/js/auth.js';                   

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

async function init() {
  try {
    if (isBooted) return;
    isBooted = true;

    // This now uses the global, clean auth.js
    const auth = await requireRole('admin');
    if (!auth) return;

    UI.cacheElements();
    UI.initOfflineAwareness();
    
    // FIX 2: Our new requireRole returns { user, role } at the top level.
    // We use auth.role instead of the non-existent auth.user.role.
    checkPermissions(auth.role); 
    
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
