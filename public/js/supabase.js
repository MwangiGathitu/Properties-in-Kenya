// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.2/+esm';

const supabaseUrl = 'https://nqwvsmuvltbiekfnvovx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd3ZzbXV2bHRiaWVrZm52b3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjU4MDAsImV4cCI6MjA5NjE0MTgwMH0.Xrc-bbAuWdvKSPHnVhTaLiQphV61xeYtDepWePqsrdo';

// Initialize Supabase with production configurations for RealtorOS
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,   // Keeps admin sessions alive in the background
    persistSession: true,     // Saves the session to localStorage
    detectSessionInUrl: true  // Handles magic links and OAuth redirects correctly
  },
  realtime: {
    params: {
      // CRITICAL: Limits events to 10/sec to prevent Supabase Realtime rate limits 
      // when your dashboard has multiple active subscriptions (payments, queue, etc.)
      eventsPerSecond: 10 
    }
  },
  global: {
    headers: {
      // Adds a custom header so you can easily filter your app's traffic in Supabase logs
      'x-client-info': 'realtyos/1.0.0'
    }
  },
  db: {
    schema: 'public' // Explicitly define the schema for your RPC calls
  }
});
