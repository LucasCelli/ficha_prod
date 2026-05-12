import { z } from "zod";
import { getCurrentSession } from "@/features/auth/session";
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

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();

  if (!session) {
    return errorResponse("Nao autenticado.", 401);
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");

  if (tipo !== "organizada" && tipo !== "bruta") {
    return errorResponse("Tipo de lista invalido.", 400);
  }

  const supabase = createServerSupabaseClient();

  if (tipo === "organizada") {
    const { data, error } = await supabase
      .from("fichas")
      .select("id, numero_venda, cliente_nome_snapshot, lista_ia")
      .eq("id", id)
      .maybeSingle<OrganizedListRow>();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Ficha nao encontrada.", 404);

    const parsed = SavedUniformListSchema.safeParse(data.lista_ia);
    if (!parsed.success) return errorResponse("Lista organizada nao encontrada.", 404);

    return Response.json({
      success: true,
      ficha: {
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

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Ficha nao encontrada.", 404);

  const raw = data.lista_nomes_raw?.trim();
  if (!raw) return errorResponse("Lista bruta nao encontrada.", 404);

  return Response.json({
    success: true,
    ficha: {
      id: data.id,
      label: getFichaLabel(data),
    },
    lista: raw,
    tipo,
  });
}
