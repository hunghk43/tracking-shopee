import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client (dùng service role key — chỉ dùng trong API routes/server)
export function createServerSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
