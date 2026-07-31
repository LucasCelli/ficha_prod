import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { renameKanbanColumn } from "@/features/quadro-producao/data";
import { renameKanbanColumnSchema } from "@/features/quadro-producao/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function handlePATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = renameKanbanColumnSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const column = await renameKanbanColumn(id, parsed.data.name);
    revalidatePath("/quadro-producao");
    return Response.json({ column });
  } catch (error) {
    const requestId = reportServerError("src/app/api/quadro-producao/columns/[id]/route.ts", error);
    return Response.json(
      { error: "Não foi possível renomear a coluna.", requestId },
      { status: 500 },
    );
  }
}

export const PATCH = withAuthenticatedRoute(handlePATCH, "src/app/api/quadro-producao/columns/[id]/route.ts");
