import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { createManualKanbanCard } from "@/features/quadro-producao/data";
import { createManualKanbanCardSchema } from "@/features/quadro-producao/schema";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = createManualKanbanCardSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const card = await createManualKanbanCard(parsed.data);
    revalidatePath("/quadro-producao");
    revalidatePath("/fichas");
    return Response.json({ card });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao criar cartão manual." },
      { status: 500 },
    );
  }
}
