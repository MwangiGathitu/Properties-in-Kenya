import { supabase } from '/public/js/supabase.js';
import { Store } from './store.js';
import { UI } from './ui.js';

const RPC_ENDPOINTS = {
  stats: 'rpc_dashboard_stats',
  ai: 'rpc_dashboard_ai',
  revenue: 'rpc_dashboard_revenue',
  health: 'rpc_dashboard_health',
  queue: 'rpc_dashboard_queue',
  activity: 'rpc_dashboard_activity'
};

async function safeRpc(rpcName, retries = 2) {
  try {
    const { data, error } = await supabase.rpc(rpcName);
    if (error) throw error;
    return data;
  } catch (err) {
    if (retries > 0) {
      return safeRpc(rpcName, retries - 1);
    }
    throw err;
  }
}

export async function loadDashboardData() {
  performance.mark('dashboard-api-start');

  const entries = Object.entries(RPC_ENDPOINTS);

  const results = await Promise.all(
    entries.map(async ([key, rpcName]) => {
      try {
        const data = await safeRpc(rpcName);
        return { key, data };
      } catch (error) {
        return { key, error };
      }
    })
  );

  results.forEach(({ key, data, error }) => {
    if (error) {
      handleModuleError(key, error);
      return;
    }
    Store.set(key, data);
  });

  performance.mark('dashboard-api-end');
  performance.measure(
    'dashboard-api-load',
    'dashboard-api-start',
    'dashboard-api-end'
  );
}

export async function loadModule(key) {
  const rpcName = RPC_ENDPOINTS[key];
  if (!rpcName) return;

  try {
    const data = await safeRpc(rpcName);
    Store.set(key, data);
  } catch (err) {
    handleModuleError(key, err);
  }
}

function handleModuleError(key, error) {
  const message = `${key.toUpperCase()} module failed to load.`;
  UI.showErrorState(
    `${key}Container`,
    message,
    `loadModule('${key}')`
  );
  console.error(`[Dashboard Error] ${key}:`, error);
}
