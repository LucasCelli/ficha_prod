import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/session";
import { sortAllKanbanCardsByDate } from "@/features/quadro-producao/data";
import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";

async function handlePOST() {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    await sortAllKanbanCardsByDate();
    revalidatePath("/quadro-producao");
    return Response.json({ ok: true });
  } catch (error) {
    const requestId = reportServerError("src/app/api/quadro-producao/sort-by-date/route.ts", error);
    return Response.json(
      { error: "Não foi possível ordenar o quadro.", requestId },
      { status: 500 },
    );
  }
}

export const POST = withAuthenticatedRoute(handlePOST, "src/app/api/quadro-producao/sort-by-date/route.ts");
