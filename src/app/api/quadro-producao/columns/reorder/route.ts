import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { reorderKanbanColumns } from "@/features/quadro-producao/data";
import { reorderKanbanColumnsSchema } from "@/features/quadro-producao/schema";

export async function POST(request: Request) {
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
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao reordenar colunas." },
      { status: 500 },
    );
  }
}
