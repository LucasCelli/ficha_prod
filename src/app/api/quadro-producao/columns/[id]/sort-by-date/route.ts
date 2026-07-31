import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { sortKanbanColumnByDate } from "@/features/quadro-producao/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function handlePOST(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await sortKanbanColumnByDate(id);
    revalidatePath("/quadro-producao");
    return Response.json({ ok: true });
  } catch (error) {
    const requestId = reportServerError("src/app/api/quadro-producao/columns/[id]/sort-by-date/route.ts", error);
    return Response.json(
      { error: "Não foi possível ordenar a coluna.", requestId },
      { status: 500 },
    );
  }
}

export const POST = withAuthenticatedRoute(handlePOST, "src/app/api/quadro-producao/columns/[id]/sort-by-date/route.ts");
