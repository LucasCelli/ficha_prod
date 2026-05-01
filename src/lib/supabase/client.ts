import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
