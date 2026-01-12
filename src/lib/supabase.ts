
import { createClient } from '@supabase/supabase-js';

// Use fallback to prevent module-level crash if ENV is missing during build/dev
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

// Log warning instead of throwing hard error to allow React to render ErrorBoundary
if (supabaseUrl === "https://placeholder.supabase.co" || supabaseKey === "placeholder-key") {
  console.error("CRITICAL: Missing Supabase Environment Variables. Check .env or GitHub Secrets.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Allow Supabase to handle JWT refresh automatically
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  }
});

// Helper for image url
export const getStorageUrl = (path: string) => {
  return `${supabaseUrl}/storage/v1/object/public/${path}`;
};
