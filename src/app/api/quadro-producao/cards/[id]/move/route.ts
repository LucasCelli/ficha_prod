import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { moveKanbanCard } from "@/features/quadro-producao/data";
import { moveKanbanCardSchema } from "@/features/quadro-producao/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = moveKanbanCardSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    await moveKanbanCard(id, parsed.data.destinationColumnId, parsed.data.destinationIndex);
    revalidatePath("/quadro-producao");
    revalidatePath("/fichas");
    revalidatePath(`/fichas/${id}`);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao mover cartão." },
      { status: 500 },
    );
  }
}
