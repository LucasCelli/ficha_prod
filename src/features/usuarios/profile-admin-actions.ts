"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/features/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveMonthlyGoalAction(formData: FormData) {
  await requireSuperadmin();
  const userId = text(formData, "userId");
  const month = text(formData, "month");
  const fichas = Math.max(0, Number(text(formData, "fichas")) || 0);
  const pieces = Math.max(0, Number(text(formData, "pieces")) || 0);
  if (!userId || !/^\d{4}-\d{2}-01$/.test(month)) redirect("/usuarios/perfis?toast=invalid");
  const { error } = await createServerSupabaseClient().from("user_monthly_goals").upsert(
    { user_id: userId, month, fichas_target: fichas, pieces_target: pieces },
    { onConflict: "user_id,month" },
  );
  if (error) redirect(`/usuarios/perfis?toast=error&message=${encodeURIComponent(error.message)}`);
  revalidatePath("/meu-painel");
  revalidatePath("/usuarios/perfis");
  redirect("/usuarios/perfis?toast=goal-saved");
}

export async function assignFichaOwnerAction(formData: FormData) {
  const session = await requireSuperadmin();
  const fichaId = text(formData, "fichaId");
  const userId = text(formData, "userId");
  const vendor = text(formData, "vendor");
  const bulk = formData.get("bulk") === "true";
  const reason = bulk ? `Atribuição em lote pelo vendedor: ${vendor}` : "Correção administrativa individual";
  if (!userId || (!fichaId && !vendor)) redirect("/usuarios/perfis?toast=invalid");
  const supabase = createServerSupabaseClient();
  let lookup = supabase.from("fichas").select("id,created_by_user_id");
  lookup = bulk ? lookup.is("created_by_user_id", null).eq("vendedor", vendor) : lookup.eq("id", fichaId);
  const { data: rows, error: lookupError } = await lookup;
  if (lookupError) redirect(`/usuarios/perfis?toast=error&message=${encodeURIComponent(lookupError.message)}`);
  const ids = (rows ?? []).map((row) => row.id);
  if (!ids.length) redirect("/usuarios/perfis?toast=invalid");
  const { error } = await supabase.from("fichas").update({ created_by_user_id: userId }).in("id", ids);
  if (error) redirect(`/usuarios/perfis?toast=error&message=${encodeURIComponent(error.message)}`);
  await supabase.from("ficha_ownership_audit").insert(
    (rows ?? []).map((row) => ({
      ficha_id: row.id,
      previous_user_id: row.created_by_user_id,
      new_user_id: userId,
      changed_by_user_id: session.user.id,
      reason,
    })),
  );
  revalidatePath("/meu-painel");
  revalidatePath("/fichas");
  revalidatePath("/usuarios/perfis");
  redirect(`/usuarios/perfis?toast=${bulk ? "owners-saved" : "owner-saved"}`);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
