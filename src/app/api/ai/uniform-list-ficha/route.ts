import { z } from "zod";
import { getCurrentSession } from "@/features/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UniformListSchema } from "@/lib/ai/schemas/uniform-list";

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

const SaveRequestSchema = z.object({
  aiModel: z.string().nullable().optional(),
  fichaId: z.string().uuid(),
  list: UniformListSchema,
  sourceText: z.string().max(10_000).optional(),
});

type FichaListLinkRow = {
  cliente_nome_snapshot: string;
  data_entrega: string;
  id: string;
  lista_ia: unknown;
  lista_ia_anexada: boolean;
  numero_venda: string | null;
};

type FichaListOptionRow = Omit<FichaListLinkRow, "lista_ia">;

function errorResponse(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

function normalizeSavedList(value: unknown) {
  const parsed = SavedUniformListSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function mapFicha(row: FichaListLinkRow) {
  return {
    cliente: row.cliente_nome_snapshot,
    dataEntrega: row.data_entrega,
    id: row.id,
    listaIaAnexada: row.lista_ia_anexada,
    listaIa: normalizeSavedList(row.lista_ia),
    numeroVenda: row.numero_venda,
  };
}

function mapFichaOption(row: FichaListOptionRow) {
  return {
    cliente: row.cliente_nome_snapshot,
    dataEntrega: row.data_entrega,
    id: row.id,
    listaIaAnexada: row.lista_ia_anexada,
    numeroVenda: row.numero_venda,
  };
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return errorResponse("Não autenticado.", 401);
  }

  const { searchParams } = new URL(request.url);
  const fichaId = searchParams.get("fichaId")?.trim();
  const query = searchParams.get("q")?.trim() ?? "";

  if (fichaId) {
    const { data, error } = await createServerSupabaseClient()
      .from("fichas")
      .select("id, numero_venda, cliente_nome_snapshot, data_entrega, lista_ia_anexada, lista_ia")
      .eq("id", fichaId)
      .maybeSingle<FichaListLinkRow>();

    if (error) {
      return errorResponse(error.message, 500);
    }

    if (!data) {
      return errorResponse("Ficha não encontrada.", 404);
    }

    return Response.json({
      success: true,
      ficha: mapFicha(data),
    });
  }

  let supabaseQuery = createServerSupabaseClient()
    .from("fichas")
    .select("id, numero_venda, cliente_nome_snapshot, data_entrega, lista_ia_anexada")
    .order("created_at", { ascending: false })
    .limit(30);

  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery) {
    supabaseQuery = supabaseQuery.ilike("busca_normalizada", `%${normalizedQuery.replace(/\s+/g, "%")}%`);
  }

  const { data, error } = await supabaseQuery.returns<FichaListOptionRow[]>();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return Response.json({
    success: true,
    fichas: (data ?? []).map(mapFichaOption),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return errorResponse("Não autenticado.", 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Envie um JSON válido.", 400);
  }

  const parsed = SaveRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse("Lista ou ficha inválida.", 400);
  }

  const savedList = {
    aiModel: parsed.data.aiModel ?? null,
    items: parsed.data.list.items,
    linkedAt: new Date().toISOString(),
    linkedBy: {
      displayName: session.user.displayName,
      id: session.user.id,
      username: session.user.username,
    },
    source: "organizar-nomes-ia" as const,
    sourceText: parsed.data.sourceText?.trim() || undefined,
    version: 1 as const,
  };

  const { data, error } = await createServerSupabaseClient()
    .from("fichas")
    .update({ lista_ia: savedList })
    .eq("id", parsed.data.fichaId)
    .select("id, numero_venda, cliente_nome_snapshot, data_entrega, lista_ia_anexada, lista_ia")
    .maybeSingle<FichaListLinkRow>();

  if (error) {
    return errorResponse(error.message, 500);
  }

  if (!data) {
    return errorResponse("Ficha não encontrada.", 404);
  }

  return Response.json({
    success: true,
    ficha: mapFicha(data),
  });
}
