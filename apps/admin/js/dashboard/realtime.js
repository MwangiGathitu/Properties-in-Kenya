// js/dashboard/realtime.js
import { supabase } from '/js/supabase.js';
import { Store } from './store.js';
import { loadModule } from './api.js';

export function setupTargetedRealtime() {
  return supabase
    .channel('admin-os-realtime')
    
    // 5. Smarter realtime: Map events to specific updates
    .on('postgres_changes', 
      { event: '*', table: 'pending_decisions' }, 
      () => loadModule('queue') // Only refresh the queue module
    )
    
    .on('postgres_changes', 
      { event: 'INSERT', table: 'payments' }, 
      (payload) => {
        // Optimistic update! No RPC call needed, instant UI update.
        Store.update('revenue', (current) => ({
          ...current,
          today: (current?.today || 0) + payload.new.amount,
          transactions: (current?.transactions || 0) + 1
        }));
      }
    )
    
    .on('postgres_changes', 
      { event: '*', table: 'events' }, 
      () => loadModule('activity') // Only refresh activity feed
    )
    .subscribe();
}
