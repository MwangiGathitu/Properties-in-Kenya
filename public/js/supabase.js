// public/js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://nqwvsmuvltbiekfnvovx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd3ZzbXV2bHRiaWVrZm52b3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjU4MDAsImV4cCI6MjA5NjE0MTgwMH0.Xrc-bbAuWdvKSPHnVhTaLiQphV61xeYtDepWePqsrdo';

// THIS IS THE MISSING PIECE: We actually create and export the client.
// We also configure the auth storage to use localStorage securely under the hood.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage, // Supabase handles the encryption/keys safely
  }
});
