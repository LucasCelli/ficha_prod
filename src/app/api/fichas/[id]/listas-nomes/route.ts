import { getServerErrorMessage, withAuthenticatedRoute } from "@/lib/server/boundaries";
import { z } from "zod";
import { UniformListSchema } from "@/lib/ai/schemas/uniform-list";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SavedUniformListSchema = z.object({
  aiModel: z.string().nullable().optional(),
  items: UniformListSchema.shape.items,
  linkedAt: z.string(),
  linkedBy: z
    .object({
      displayName: z.string(),
      id: z.string(),
      username: z.string(),
    })
    .optional(),
  source: z.literal("organizar-nomes-ia"),
  sourceText: z.string().optional(),
  version: z.literal(1),
});

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type OrganizedListRow = {
  cliente_nome_snapshot: string;
  id: string;
  lista_ia: unknown;
  numero_venda: string | null;
};

type RawListRow = {
  cliente_nome_snapshot: string;
  id: string;
  lista_nomes_raw: string | null;
  numero_venda: string | null;
};

function errorResponse(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

function getFichaLabel(row: { cliente_nome_snapshot: string; numero_venda: string | null }) {
  return `${row.numero_venda ? `Venda ${row.numero_venda}` : "Sem venda"} - ${row.cliente_nome_snapshot}`;
}

async function handleGET(request: Request, { params }: RouteParams) {

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");

  if (tipo !== "organizada" && tipo !== "bruta") {
    return errorResponse("Tipo de lista inválido.", 400);
  }

  const supabase = createServerSupabaseClient();

  if (tipo === "organizada") {
    const { data, error } = await supabase
      .from("fichas")
      .select("id, numero_venda, cliente_nome_snapshot, lista_ia")
      .eq("id", id)
      .maybeSingle<OrganizedListRow>();

    if (error) return errorResponse(getServerErrorMessage("api.fichas.listas-nomes", error, "Não foi possível consultar a lista."), 500);
    if (!data) return errorResponse("Ficha não encontrada.", 404);

    const parsed = SavedUniformListSchema.safeParse(data.lista_ia);
    if (!parsed.success) return errorResponse("Lista organizada não encontrada.", 404);

    return Response.json({
      success: true,
      ficha: {
        clienteNome: data.cliente_nome_snapshot,
        id: data.id,
        label: getFichaLabel(data),
      },
      lista: parsed.data,
      tipo,
    });
  }

  const { data, error } = await supabase
    .from("fichas")
    .select("id, numero_venda, cliente_nome_snapshot, lista_nomes_raw")
    .eq("id", id)
    .maybeSingle<RawListRow>();

  if (error) return errorResponse(getServerErrorMessage("api.fichas.listas-nomes", error, "Não foi possível consultar a lista."), 500);
  if (!data) return errorResponse("Ficha não encontrada.", 404);

  const raw = data.lista_nomes_raw?.trim();
  if (!raw) return errorResponse("Lista bruta não encontrada.", 404);

  return Response.json({
    success: true,
    ficha: {
      clienteNome: data.cliente_nome_snapshot,
      id: data.id,
      label: getFichaLabel(data),
    },
    lista: raw,
    tipo,
  });
}

export const GET = withAuthenticatedRoute(handleGET, "src/app/api/fichas/[id]/listas-nomes/route.ts");
