"use server";

import { getActionError, requireSuperadminAction } from "@/lib/server/boundaries";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ADMIN_REASON = "Transferência administrativa pela gestão de autoria";

type AssignOwnerInput = { userId: string; fichaIds: string[] };
type AssignOwnerResult =
  | { ok: true; changedIds: string[]; userId: string; message: string }
  | { ok: false; message: string };

export async function assignFichaOwnerAction(input: AssignOwnerInput): Promise<AssignOwnerResult> {
  const session = await requireSuperadminAction();
  const userId = input.userId.trim();
  const ids = [...new Set(input.fichaIds.map((id) => id.trim()).filter(Boolean))];
  if (!userId || !ids.length) return { ok: false, message: "Selecione um autor e ao menos uma ficha." };

  const supabase = createServerSupabaseClient();
  const { data: rows, error: lookupError } = await supabase
    .from("fichas")
    .select("id,created_by_user_id")
    .in("id", ids);
  if (lookupError) {
    return { ok: false, message: getActionError("usuarios.owner.lookup", lookupError, "Não foi possível consultar as fichas.").message };
  }

  const changed = (rows ?? []).filter((row) => row.created_by_user_id !== userId);
  if (!changed.length) return { ok: false, message: "As fichas selecionadas já pertencem a esse autor." };

  const changedIds = changed.map((row) => row.id);
  const { error } = await supabase.from("fichas").update({ created_by_user_id: userId }).in("id", changedIds);
  if (error) {
    return { ok: false, message: getActionError("usuarios.owner.update", error, "Não foi possível alterar o autor.").message };
  }

  const { error: auditError } = await supabase.from("ficha_ownership_audit").insert(
    changed.map((row) => ({
      ficha_id: row.id,
      previous_user_id: row.created_by_user_id,
      new_user_id: userId,
      changed_by_user_id: session.user.id,
      reason: ADMIN_REASON,
    })),
  );
  if (auditError) {
    await Promise.all(
      changed.map((row) =>
        supabase.from("fichas").update({ created_by_user_id: row.created_by_user_id }).eq("id", row.id),
      ),
    );
    return { ok: false, message: getActionError("usuarios.owner.audit", auditError, "Não foi possível registrar a auditoria; a alteração foi revertida.").message };
  }

  revalidatePath("/meu-painel");
  revalidatePath("/fichas");
  return {
    ok: true,
    changedIds,
    userId,
    message: changed.length > 1 ? "Autores atualizados." : "Autor atualizado.",
  };
}
