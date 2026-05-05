import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { renameKanbanColumn } from "@/features/quadro-producao/data";
import { renameKanbanColumnSchema } from "@/features/quadro-producao/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao renomear coluna." },
      { status: 500 },
    );
  }
}
