const supabaseClient = supabase.createClient(
    "https://nqwvsmuvltbiekfnvovx.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd3ZzbXV2bHRiaWVrZm52b3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjU4MDAsImV4cCI6MjA5NjE0MTgwMH0.Xrc-bbAuWdvKSPHnVhTaLiQphV61xeYtDepWePqsrdo"
);

const state = {
    allProperties: [],
    searchTimeout: null
};

const FAVORITES_KEY = 'propertiesinkenya_favorites';
