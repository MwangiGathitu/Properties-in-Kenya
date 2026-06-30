// js/dashboard/audit.js
import { supabase } from '/js/supabase.js';
export async function logAudit(action, targetId, metadata = {}) {
  await supabase.functions.invoke('audit-logger', { 
    body: { action, targetId, timestamp: new Date(), ...metadata } 
  });
}
