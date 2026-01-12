import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
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