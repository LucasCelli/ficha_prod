import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { moveKanbanCard } from "@/features/quadro-producao/data";
import { moveKanbanCardSchema } from "@/features/quadro-producao/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function handlePATCH(request: Request, context: RouteContext) {
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
    const requestId = reportServerError("src/app/api/quadro-producao/cards/[id]/move/route.ts", error);
    return Response.json(
      { error: "Não foi possível mover o cartão.", requestId },
      { status: 500 },
    );
  }
}

export const PATCH = withAuthenticatedRoute(handlePATCH, "src/app/api/quadro-producao/cards/[id]/move/route.ts");
