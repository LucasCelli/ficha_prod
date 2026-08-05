import { getServerErrorMessage, withAuthenticatedRoute } from "@/lib/server/boundaries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type FichaRow = {
  cliente_nome_snapshot: string;
  cor_material: string | null;
  ficha_imagens?: Array<{ url: string }> | null;
  ficha_itens?: Array<{ quantidade: number; tamanho: string | null }> | null;
  id: string;
  material: string | null;
  numero_venda: string | null;
};

const COLUMNS = "id, numero_venda, cliente_nome_snapshot, material, cor_material, ficha_itens(tamanho, quantidade), ficha_imagens(url)";

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().trim();
}

function mapFicha(row: FichaRow) {
  const quantitiesBySize = new Map<string, number>();
  for (const item of row.ficha_itens ?? []) {
    const size = item.tamanho?.trim().toUpperCase() ?? "";
    if (size && item.quantidade > 0) quantitiesBySize.set(size, (quantitiesBySize.get(size) ?? 0) + item.quantidade);
  }
  const items = [...quantitiesBySize].map(([size, quantity]) => ({ quantity, size }));
  return { client: row.cliente_nome_snapshot, color: row.cor_material?.trim() ?? "", id: row.id, imageUrl: row.ficha_imagens?.[0]?.url ?? null, items, material: row.material?.trim() ?? "", number: row.numero_venda, total: items.reduce((sum, item) => sum + item.quantity, 0) };
}

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fichaId = searchParams.get("fichaId")?.trim();
  const query = searchParams.get("q")?.trim() ?? "";
  const supabase = createServerSupabaseClient();
  try {
    if (fichaId) {
      const { data, error } = await supabase.from("fichas").select(COLUMNS).eq("id", fichaId).maybeSingle<FichaRow>();
      if (error) throw error;
      if (!data) return Response.json({ success: false, error: "Ficha não encontrada." }, { status: 404 });
      return Response.json({ success: true, ficha: mapFicha(data) });
    }
    let databaseQuery = supabase.from("fichas").select(COLUMNS).order("created_at", { ascending: false }).limit(30);
    const normalizedQuery = normalizeSearchText(query);
    if (normalizedQuery) databaseQuery = databaseQuery.ilike("busca_normalizada", "%" + normalizedQuery.replace(/\s+/g, "%") + "%");
    const { data, error } = await databaseQuery.returns<FichaRow[]>();
    if (error) throw error;
    return Response.json({ success: true, fichas: (data ?? []).map(mapFicha) });
  } catch (error) {
    return Response.json({ success: false, error: getServerErrorMessage("api.cut-plan-fichas", error, "Não foi possível carregar as fichas.") }, { status: 500 });
  }
}

export const GET = withAuthenticatedRoute(handleGET, "src/app/api/ferramentas/plano-de-corte/fichas/route.ts");
