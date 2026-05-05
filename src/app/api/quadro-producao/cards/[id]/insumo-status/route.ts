import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { updateKanbanCardInsumoStatus } from "@/features/quadro-producao/data";
import { updateKanbanCardInsumoSchema } from "@/features/quadro-producao/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = updateKanbanCardInsumoSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    await updateKanbanCardInsumoStatus(id, parsed.data.insumoStatus);
    revalidatePath("/quadro-producao");
    revalidatePath("/fichas");
    revalidatePath(`/fichas/${id}`);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar insumos." },
      { status: 500 },
    );
  }
}
