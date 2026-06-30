// js/dashboard/api.js
import { supabase } from '/js/supabase.js';
import { Store } from './store.js';
import { UI } from './ui.js';

// 4. Broken down RPCs
const RPC_ENDPOINTS = {
  stats: 'rpc_dashboard_stats',
  ai: 'rpc_dashboard_ai',
  revenue: 'rpc_dashboard_revenue',
  health: 'rpc_dashboard_health',
  queue: 'rpc_dashboard_queue',
  activity: 'rpc_dashboard_activity'
};

// 3. Parallelize loading & 11. Contextual Error Handling
export async function loadDashboardData() {
  performance.mark('dashboard-api-start'); // 9. Performance instrumentation

  const requests = Object.entries(RPC_ENDPOINTS).map(async ([key, rpcName]) => {
    try {
      const { data, error } = await supabase.rpc(rpcName);
      if (error) throw error;
      return { key, data, success: true };
    } catch (err) {
      return { key, error: err, success: false };
    }
  });

  const results = await Promise.allSettled(requests);
  
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      Store.set(result.value.key, result.value.data); // Triggers specific renderers
    } else if (result.status === 'fulfilled' && !result.value.success) {
      handleModuleError(result.value.key, result.value.error);
    }
  });

  performance.mark('dashboard-api-end');
  performance.measure('dashboard-api-load', 'dashboard-api-start', 'dashboard-api-end');
}

// Reload a specific module (used by targeted realtime or retry buttons)
export async function loadModule(key) {
  const rpcName = RPC_ENDPOINTS[key];
  if (!rpcName) return;
  try {
    const { data, error } = await supabase.rpc(rpcName);
    if (error) throw error;
    Store.set(key, data);
  } catch (err) { handleModuleError(key, err); }
}

function handleModuleError(key, error) {
  const messages = {
    revenue: 'Revenue data is temporarily unavailable.',
    health: 'System health metrics could not be loaded.',
    activity: 'Recent activity is unavailable.'
  };
  UI.showErrorState(`${key}Container`, messages[key] || 'Module failed to load.', `loadModule('${key}')`);
}
