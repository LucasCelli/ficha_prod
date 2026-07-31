import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { reorderKanbanColumns } from "@/features/quadro-producao/data";
import { reorderKanbanColumnsSchema } from "@/features/quadro-producao/schema";

async function handlePOST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = reorderKanbanColumnsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    await reorderKanbanColumns(parsed.data.columnIds);
    revalidatePath("/quadro-producao");
    return Response.json({ ok: true });
  } catch (error) {
    const requestId = reportServerError("src/app/api/quadro-producao/columns/reorder/route.ts", error);
    return Response.json(
      { error: "Não foi possível reordenar as colunas.", requestId },
      { status: 500 },
    );
  }
}

export const POST = withAuthenticatedRoute(handlePOST, "src/app/api/quadro-producao/columns/reorder/route.ts");
