
import { createClient } from '@supabase/supabase-js';

// DEBUG: Log Env availability (Masked for security)
const envUrl = (import.meta as any).env.VITE_SUPABASE_URL || (window as any).__ENV__?.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (window as any).__ENV__?.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Init] Checking Environment Variables:');
console.log('- URL Exists:', !!envUrl, envUrl ? `(Starts with: ${envUrl.substring(0, 8)}...)` : 'MISSING');
console.log('- KEY Exists:', !!envKey, envKey ? '(Present)' : 'MISSING');

// Fallback values to prevent white-screen crash during module load
const supabaseUrl = envUrl || "https://placeholder.supabase.co";
const supabaseKey = envKey || "placeholder-key";

if (supabaseUrl === "https://placeholder.supabase.co") {
  console.error("CRITICAL ERROR: VITE_SUPABASE_URL is missing. Check .env or GitHub Secrets injection.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
});

// Helper for image url
export const getStorageUrl = (path: string) => {
  return `${supabaseUrl}/storage/v1/object/public/${path}`;
};
