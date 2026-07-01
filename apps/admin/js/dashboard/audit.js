import { supabase } from '/public/shared/js/supabase.js';

let queue = [];
let flushTimer = null;

async function flushQueue() {
  if (queue.length === 0) return;

  const batch = [...queue];
  queue = [];

  try {
    await supabase.functions.invoke('audit-logger', {
      body: { events: batch }
    });
  } catch (err) {
    console.warn('Audit batch failed, retrying...', err);

    // simple retry fallback
    queue = [...batch, ...queue];
  }
}

export function logAudit(action, targetId, metadata = {}) {
  queue.push({
    action,
    targetId,
    metadata,
    timestamp: new Date().toISOString()
  });

  // debounce flush (batching)
  if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushQueue();
    }, 1000);
  }
}
