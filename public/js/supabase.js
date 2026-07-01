import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.2/+esm';

const supabaseUrl = 'https://nqwvsmuvltbiekfnvovx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd3ZzbXV2bHRiaWVrZm52b3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjU4MDAsImV4cCI6MjA5NjE0MTgwMH0.Xrc-bbAuWdvKSPHnVhTaLiQphV61xeYtDepWePqsrdo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-info': 'realtyos/1.0.0'
    }
  },
  db: {
    schema: 'public'
  }
});
