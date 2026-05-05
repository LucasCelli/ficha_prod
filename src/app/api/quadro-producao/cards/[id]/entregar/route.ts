import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { markKanbanCardDelivered } from "@/features/quadro-producao/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await markKanbanCardDelivered(id);
    revalidatePath("/quadro-producao");
    revalidatePath("/fichas");
    revalidatePath("/relatorios");
    revalidatePath(`/fichas/${id}`);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao entregar cartão." },
      { status: 500 },
    );
  }
}
