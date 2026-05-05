import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { createKanbanColumn } from "@/features/quadro-producao/data";
import { createKanbanColumnSchema } from "@/features/quadro-producao/schema";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = createKanbanColumnSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const column = await createKanbanColumn(parsed.data.name);
    revalidatePath("/quadro-producao");
    return Response.json({ column });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao criar coluna." },
      { status: 500 },
    );
  }
}
