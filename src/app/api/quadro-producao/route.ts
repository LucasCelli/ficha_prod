import { loadQuadroProducaoSearchParams } from "@/features/quadro-producao/search-params";
import { getQuadroProducaoSnapshot } from "@/features/quadro-producao/data";
import { getCurrentSession } from "@/features/auth/session";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const filters = await loadQuadroProducaoSearchParams(new URL(request.url));
  const result = await getQuadroProducaoSnapshot(filters);

  if (result.kind === "error") {
    return Response.json({ error: result.message }, { status: 500 });
  }

  if (result.kind === "not-configured") {
    return Response.json({ kind: result.kind, snapshot: null }, { status: 503 });
  }

  return Response.json(result);
}
