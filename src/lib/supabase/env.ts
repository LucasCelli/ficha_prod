export type SupabaseConfigStatus = {
  hasPublicConfig: boolean;
  hasServerConfig: boolean;
};

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  return {
    hasPublicConfig: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServerConfig: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}
