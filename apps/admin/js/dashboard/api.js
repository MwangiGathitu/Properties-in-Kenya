// FIXED IMPORTS – Standard root-relative paths for Vercel/Cloudflare static assets.
import { supabase } from '/js/supabase.js';
import { Store } from './store.js';

const RPC_ENDPOINTS = {
  stats: 'rpc_dashboard_stats',
  ai: 'rpc_dashboard_ai',
  revenue: 'rpc_dashboard_revenue',
  health: 'rpc_dashboard_health',
  queue: 'rpc_dashboard_queue',
  activity: 'rpc_dashboard_activity'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to timeout individual RPCs so one slow widget doesn't block the others
const withTimeout = (promise, ms, name) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${name} timed out`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

// FIXED: Skip retries for deterministic client errors (4xx, Auth, RLS)
const isRetryable = (err) => {
  const status = err?.status || err?.code || 0;
  if (status >= 400 && status < 500) return false;
  
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('policy') || msg.includes('permission')) {
    return false;
  }
  return true;
};

async function safeRpc(rpcName, retries = 2) {
  try {
    const { data, error } = await supabase.rpc(rpcName);
    if (error) throw error;
    return data;
  } catch (err) {
    if (retries > 0 && isRetryable(err)) {
      await sleep(500 * (3 - retries)); 
      return safeRpc(rpcName, retries - 1);
    }
    throw err;
  }
}

export async function loadDashboardData() {
  if (typeof performance !== 'undefined') {
    // FIXED: Clear previous marks to prevent timeline clutter on manual refresh/polling
    performance.clearMarks('dashboard-api-start');
    performance.clearMarks('dashboard-api-end');
    performance.clearMeasures('dashboard-api-load');
    performance.mark('dashboard-api-start');
  }

  const entries = Object.entries(RPC_ENDPOINTS);

  // FIXED: Use Promise.allSettled and individual timeouts. 
  // A slow widget now fails gracefully in the Store instead of crashing the global caller timeout.
  const results = await Promise.allSettled(
    entries.map(async ([key, rpcName]) => {
      try {
        const data = await withTimeout(safeRpc(rpcName), 8000, rpcName);
        return { key, data, error: null };
      } catch (error) {
        return { key, data: null, error };
      }
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { key, data, error } = result.value;
      if (error) {
        handleModuleError(key, error);
      } else {
        Store.set(key, data);
      }
    } else {
      console.error('Unexpected promise rejection in dashboard load:', result.reason);
    }
  });

  if (typeof performance !== 'undefined') {
    performance.mark('dashboard-api-end');
    performance.measure('dashboard-api-load', 'dashboard-api-start', 'dashboard-api-end');
  }
}

export async function loadModule(key) {
  const rpcName = RPC_ENDPOINTS[key];
  if (!rpcName) return;

  try {
    const data = await withTimeout(safeRpc(rpcName), 8000, rpcName);
    Store.set(key, data);
  } catch (err) {
    handleModuleError(key, err);
  }
}

function handleModuleError(key, error) {
  console.error(`[Dashboard API Error] ${key}:`, error);
  
  // Store the error state. 
  // NOTE: Widget renderers MUST check for `data.__error === true` before calling .map() or .length
  Store.set(key, { 
    __error: true, 
    message: `${key.toUpperCase()} module failed to load.`,
    details: error?.message || 'Unknown error'
  });
}
