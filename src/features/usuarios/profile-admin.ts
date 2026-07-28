import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const OWNERSHIP_PAGE_SIZE = 25;
export async function getProfileAdminData(input: { page?: number; busca?: string; autor?: string; semAutor?: boolean } = {}) {
  const supabase = createServerSupabaseClient();
  const page = Math.max(1, input.page ?? 1);
  let fichasQuery = supabase.from("fichas")
    .select("id,cliente_nome_snapshot,vendedor,created_at,created_by_user_id,author:app_users!fichas_created_by_user_id_fkey(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * OWNERSHIP_PAGE_SIZE, page * OWNERSHIP_PAGE_SIZE - 1);
  if (input.semAutor) fichasQuery = fichasQuery.is("created_by_user_id", null);
  else if (input.autor?.trim()) fichasQuery = fichasQuery.eq("created_by_user_id", input.autor.trim());
  if (input.busca?.trim()) fichasQuery = fichasQuery.ilike("cliente_nome_snapshot", `%${input.busca.trim().replace(/[%_]/g, "")}%`);
  const [users, fichas] = await Promise.all([
    supabase.from("app_users").select("id,display_name,username,active").order("display_name"),
    fichasQuery,
  ]);
  const error = users.error ?? fichas.error;
  if (error) return { kind:"error" as const, message:error.message, users:[], fichas:[], total:0, page };
  return { kind:"ok" as const, users:users.data??[], fichas:fichas.data??[], total:fichas.count??0, page };
}
