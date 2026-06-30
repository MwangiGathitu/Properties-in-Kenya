// Supabase CDN loader (safe version)
window.supabase = window.supabase || {};

// Load official Supabase client
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
script.onload = () => {
  console.log("Supabase JS loaded successfully");
};
document.head.appendChild(script);
