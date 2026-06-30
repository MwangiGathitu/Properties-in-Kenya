import { supabase } from '/js/supabase.js';
import { Store } from './store.js';
import { loadModule } from './api.js';

let channelInstance = null;

// prevent duplicate optimistic updates
const processedPayments = new Set();

export function setupTargetedRealtime() {
  if (channelInstance) {
    supabase.removeChannel(channelInstance);
  }

  channelInstance = supabase
    .channel('admin-os-realtime')

    // Queue updates (only when meaningful changes happen)
    .on('postgres_changes',
      { event: 'INSERT', table: 'pending_decisions' },
      () => loadModule('queue')
    )

    // Safe optimistic revenue update
    .on('postgres_changes',
      { event: 'INSERT', table: 'payments' },
      (payload) => {
        const id = payload.new?.id;
        if (!id || processedPayments.has(id)) return;

        processedPayments.add(id);

        Store.update('revenue', (current) => ({
          ...current,
          today: (current?.today || 0) + (payload.new.amount || 0),
          transactions: (current?.transactions || 0) + 1
        }));
      }
    )

    // Activity feed updates
    .on('postgres_changes',
      { event: 'INSERT', table: 'events' },
      () => loadModule('activity')
    )
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('Realtime subscription issue:', status);
      }
    });

  return channelInstance;
}

// safe cleanup hook (important for dashboard reloads)
export function teardownRealtime() {
  if (channelInstance) {
    supabase.removeChannel(channelInstance);
    channelInstance = null;
  }
}
