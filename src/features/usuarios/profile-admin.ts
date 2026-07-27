import "server-only";

import { getBusinessTodayInput } from "@/lib/dates";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getProfileAdminData() {
  const supabase = createServerSupabaseClient();
  const month = `${getBusinessTodayInput().slice(0, 7)}-01`;
  const [users, goals, unassigned] = await Promise.all([
    supabase.from("app_users").select("id,display_name,username,active").order("display_name"),
    supabase.from("user_monthly_goals").select("user_id,fichas_target,pieces_target").eq("month", month),
    supabase
      .from("fichas")
      .select("id,cliente_nome_snapshot,vendedor,created_at")
      .is("created_by_user_id", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const error = users.error ?? goals.error ?? unassigned.error;
  if (error) return { kind: "error" as const, message: error.message, users: [], goals: [], unassigned: [], month };
  return {
    kind: "ok" as const,
    users: users.data ?? [],
    goals: goals.data ?? [],
    unassigned: unassigned.data ?? [],
    month,
  };
}
