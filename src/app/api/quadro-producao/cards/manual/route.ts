import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { createManualKanbanCard } from "@/features/quadro-producao/data";
import { createManualKanbanCardSchema } from "@/features/quadro-producao/schema";

async function handlePOST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = createManualKanbanCardSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const card = await createManualKanbanCard(parsed.data, session.user.id);
    revalidatePath("/quadro-producao");
    revalidatePath("/fichas");
    revalidatePath("/meu-painel");
    return Response.json({ card });
  } catch (error) {
    const requestId = reportServerError("src/app/api/quadro-producao/cards/manual/route.ts", error);
    return Response.json(
      { error: "Não foi possível criar o cartão manual.", requestId },
      { status: 500 },
    );
  }
}

export const POST = withAuthenticatedRoute(handlePOST, "src/app/api/quadro-producao/cards/manual/route.ts");
