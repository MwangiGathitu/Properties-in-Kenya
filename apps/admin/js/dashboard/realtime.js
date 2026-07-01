import { supabase } from '/public/js/supabase.js';
import { Store } from './store.js';
import { loadModule } from './api.js';

let channelInstance = null;
const processedPayments = new Set();

export function setupTargetedRealtime() {
  if (channelInstance) {
    supabase.removeChannel(channelInstance);
  }

  channelInstance = supabase
    .channel('admin-os-realtime')
    .on('postgres_changes',
      { event: 'INSERT', table: 'pending_decisions' },
      () => loadModule('queue')
    )
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

export function teardownRealtime() {
  if (channelInstance) {
    supabase.removeChannel(channelInstance);
    channelInstance = null;
  }
}
