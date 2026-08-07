// FIXED IMPORTS – Standard root-relative paths for Vercel/Cloudflare static assets.
import { supabase } from '/js/supabase.js';
import { Store } from './store.js';
import { loadModule } from './api.js';

let channelInstance = null;
let processedEvents = new Map(); // key -> timestamp
let isReloadingRevenue = false;
let reloadTimeoutId = null;
let revenueEventBuffer = [];
let pruneIntervalId = null;

const SUCCESS_STATUSES = ['completed', 'successful', 'paid', 'succeeded', 'cleared'];

function isSuccessfulStatus(status) {
  if (!status) return false;
  return SUCCESS_STATUSES.includes(String(status).toLowerCase());
}

// Concurrency-aware throttle to prevent overlapping API calls and stale data overwrites
function createThrottledLoader(fn, delay) {
  let timeoutId = null;
  let lastCallTime = 0;
  let isExecuting = false;
  let pendingCall = false;

  const execute = async () => {
    if (isExecuting) return;
    isExecuting = true;
    lastCallTime = Date.now();
    try {
      await fn();
    } catch (e) {
      console.error('Throttled load failed:', e);
    } finally {
      isExecuting = false;
      if (pendingCall) {
        pendingCall = false;
        timeoutId = setTimeout(execute, delay);
      }
    }
  };

  const throttled = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (!isExecuting && timeSinceLastCall >= delay) {
      execute();
    } else {
      pendingCall = true;
      clearTimeout(timeoutId);
      const waitTime = isExecuting ? delay : (delay - timeSinceLastCall);
      timeoutId = setTimeout(execute, waitTime);
    }
  };

  throttled.cancel = () => {
    clearTimeout(timeoutId);
    pendingCall = false;
  };
  
  return throttled;
}

const throttledLoadQueue = createThrottledLoader(() => loadModule('queue'), 1500);
const throttledLoadActivity = createThrottledLoader(() => loadModule('activity'), 1500);

function startPruneInterval() {
  if (pruneIntervalId) return;
  pruneIntervalId = setInterval(() => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [key, timestamp] of processedEvents.entries()) {
      if (timestamp < fiveMinutesAgo) {
        processedEvents.delete(key);
      }
    }
  }, 5000);
}

function stopPruneInterval() {
  if (pruneIntervalId) {
    clearInterval(pruneIntervalId);
    pruneIntervalId = null;
  }
}

function triggerRevenueReload() {
  if (!isReloadingRevenue) {
    isReloadingRevenue = true;
    reloadTimeoutId = setTimeout(() => { isReloadingRevenue = false; }, 10000);
    
    loadModule('revenue').finally(() => { 
      isReloadingRevenue = false; 
      clearTimeout(reloadTimeoutId);
      
      // Process buffered events sequentially after fresh baseline is loaded
      const buffered = [...revenueEventBuffer];
      revenueEventBuffer = [];
      buffered.forEach(processRevenueEvent);
    });
  }
}

function processRevenueEvent(payload) {
  const eventType = payload.eventType;
  const newRecord = payload.new;
  const oldRecord = payload.old;

  // Fallback to full reload if REPLICA IDENTITY is not FULL and we lack old data
  if ((eventType === 'UPDATE' || eventType === 'DELETE') && oldRecord && typeof oldRecord.amount !== 'number') {
    console.warn('Realtime payload.old missing amount. Triggering full revenue reload.');
    triggerRevenueReload();
    return;
  }

  Store.update('revenue', (current) => {
    if (!current || current.__error) return current;
    
    let deltaAmount = 0;
    let deltaTransactions = 0;

    if (eventType === 'INSERT') {
      if (isSuccessfulStatus(newRecord?.status)) {
        const amount = typeof newRecord?.amount === 'number' ? newRecord.amount : 0;
        deltaAmount = amount;
        deltaTransactions = 1;
      }
    } else if (eventType === 'UPDATE') {
      const oldAmount = typeof oldRecord?.amount === 'number' ? oldRecord.amount : 0;
      const newAmount = typeof newRecord?.amount === 'number' ? newRecord.amount : 0;
      
      const oldSuccess = isSuccessfulStatus(oldRecord?.status);
      const newSuccess = isSuccessfulStatus(newRecord?.status);

      if (oldSuccess && newSuccess) {
         deltaAmount = newAmount - oldAmount;
      } else if (!oldSuccess && newSuccess) {
         deltaAmount = newAmount;
         deltaTransactions = 1;
      } else if (oldSuccess && !newSuccess) {
         deltaAmount = -oldAmount;
         deltaTransactions = -1;
      }
    } else if (eventType === 'DELETE') {
      if (isSuccessfulStatus(oldRecord?.status)) {
        const amount = typeof oldRecord?.amount === 'number' ? oldRecord.amount : 0;
        deltaAmount = -amount;
        deltaTransactions = -1;
      }
    }

    const newToday = (current.today || 0) + deltaAmount;
    const newTransactions = (current.transactions || 0) + deltaTransactions;

    if (newToday < 0 || newTransactions < 0) {
       console.warn('Revenue drift detected (negative value). Triggering full reload.');
       triggerRevenueReload();
       return current;
    }

    return {
      ...current,
      today: newToday,
      transactions: newTransactions
    };
  });
}

export function setupTargetedRealtime() {
  if (channelInstance) {
    supabase.removeChannel(channelInstance);
  }

  processedEvents.clear();
  revenueEventBuffer = [];
  isReloadingRevenue = false;
  clearTimeout(reloadTimeoutId);
  startPruneInterval();

  channelInstance = supabase
    .channel('admin-os-realtime')
    .on('postgres_changes',
      { event: 'INSERT', table: 'pending_decisions' },
      () => throttledLoadQueue()
    )
    .on('postgres_changes',
      { event: '*', table: 'payments' },
      (payload) => {
        const id = payload.new?.id || payload.old?.id;
        if (!id) return;
        
        const commitTime = payload.commit_timestamp || Date.now();
        const eventKey = `${id}-${payload.eventType}-${commitTime}`;
        
        if (processedEvents.has(eventKey)) return;
        processedEvents.set(eventKey, Date.now());

        // Buffer events if a reload is already in progress
        if (isReloadingRevenue) {
            revenueEventBuffer.push(payload);
            return;
        }

        const currentRevenue = Store.get('revenue');
        if (!currentRevenue || currentRevenue.__error) {
          revenueEventBuffer.push(payload);
          triggerRevenueReload();
          return; 
        }

        processRevenueEvent(payload);
      }
    )
    .on('postgres_changes',
      { event: 'INSERT', table: 'events' },
      () => throttledLoadActivity()
    )
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('Realtime subscription issue:', status);
      }
    });

  return channelInstance;
}

export function teardownRealtime() {
  if (channelInstance) {
    supabase.removeChannel(channelInstance);
    channelInstance = null;
  }
  
  throttledLoadQueue.cancel();
  throttledLoadActivity.cancel();
  stopPruneInterval();
  processedEvents.clear();
  revenueEventBuffer = [];
  isReloadingRevenue = false;
  clearTimeout(reloadTimeoutId);
}
