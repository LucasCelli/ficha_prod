import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { deleteManualKanbanCard } from "@/features/quadro-producao/data";
import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";

type RouteContext = { params: Promise<{ id: string }> };

async function handleDELETE(_request: Request, context: RouteContext) {
  if (!await getCurrentSession()) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await context.params;
  try {
    await deleteManualKanbanCard(id);
    revalidatePath("/quadro-producao");
    return Response.json({ ok: true });
  } catch (error) {
    const requestId = reportServerError("src/app/api/quadro-producao/cards/[id]/manual/route.ts", error);
    return Response.json({ error: "Não foi possível excluir o cartão manual.", requestId }, { status: 500 });
  }
}

export const DELETE = withAuthenticatedRoute(handleDELETE, "src/app/api/quadro-producao/cards/[id]/manual/route.ts");
