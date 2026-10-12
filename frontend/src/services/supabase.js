import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Remove credentials saved by the retired client-side provider settings. Model
// credentials are now deployment-managed and must not remain in localStorage.
if (typeof window !== "undefined") {
  for (const key of ["gemini_key", "groq_key", "openrouter_api_key"]) {
    try { window.localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window === "undefined" ? undefined : window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function getSupabaseAccessToken() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token || null;
}
