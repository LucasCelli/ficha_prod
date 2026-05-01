import "dotenv/config";

import { createClient as createLibsqlClient } from "@libsql/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.replace("--limit=", "")) : null;

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

function emptyToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeDate(value) {
  const text = emptyToNull(value);
  if (!text) return null;

  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const brDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brDate) return `${brDate[3]}-${brDate[2]}-${brDate[1]}`;

  return null;
}

function normalizeTimestamp(value) {
  const text = emptyToNull(value);
  if (!text) return undefined;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "entregue") return "entregue";
  if (status === "cancelado") return "cancelado";
  return "pendente";
}

function normalizeKanbanStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  const allowed = new Set(["pendente", "exportando", "fila_impressao", "sublimando", "na_costura"]);
  return allowed.has(status) ? status : "pendente";
}

function normalizeInsumoStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  const allowed = new Set(["tudo_ok", "sem_tecido", "sem_tinta", "sem_papel", "pendencias"]);
  return allowed.has(status) ? status : "tudo_ok";
}

const GOLA_LABELS = {
  canoa: "Gola Canoa",
  padre_esportiva: "Gola Padre Esportiva",
  padre_ziper: "Gola Padre com Zíper",
  polo: "Gola Polo",
  redonda: "Gola Redonda",
  social: "Gola Social",
  v: "Gola V",
  v_polo: "Gola V Polo",
};

const ACABAMENTO_GOLA_LABELS = {
  ribana: "Ribana",
  ribana_3_5: "Ribana 3,5",
  ribana_molde: "Ribana em Molde",
  ribana_sublimada: "Ribana Sublimada",
  vies: "Viés",
  vies_sublimado: "Viés Sublimado",
};

const ACABAMENTO_MANGA_LABELS = {
  barra: "Barra",
  punho: "Punho",
  punho_ribana: "Punho de Ribana",
  punho_vies_sublimado: "Punho Sublimado",
  vies: "Viés",
  vies_sublimado: "Viés Sublimado",
};

const BOLSO_LABELS = {
  dois_frente: "2 Bolsos na Frente",
  dois_frente_atras: "2 Bolsos na Frente e 2 Atrás",
  dois_frente_um_atras: "2 Bolsos na Frente e 1 Atrás",
  embutido: "Bolsos na Frente Embutidos",
  externo: "Bolsos na Frente Externos",
  frente_traseiro: "Bolso frente e traseiro",
  nenhum: "Sem bolso",
  peito: "Bolso no Peito",
  traseiros: "2 Bolsos Traseiros",
  um_traseiro: "1 Bolso Traseiro",
};

function normalizeOptionLabel(value, labels) {
  const text = emptyToNull(value);
  if (!text) return null;

  return labels[text] ?? text;
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeProdutoItem(item, index) {
  const produto = emptyToNull(item.produto ?? item.descricao ?? item.nome);

  return {
    dados: item && typeof item === "object" ? item : {},
    descricao: produto,
    detalhes: emptyToNull(item.detalhes),
    detalhes_produto: emptyToNull(item.detalhesProduto ?? item.detalhes_produto),
    ordem: index,
    produto,
    quantidade: Number.parseInt(String(item.quantidade ?? "1"), 10) || 1,
    tamanho: emptyToNull(item.tamanho),
  };
}

function normalizeImagemItem(item, index) {
  const url = emptyToNull(item.src ?? item.url ?? item.secureUrl ?? item.secure_url);
  if (!url || url.startsWith("data:")) return null;

  const publicId = emptyToNull(item.publicId ?? item.public_id);

  return {
    alt_text: emptyToNull(item.descricao ?? item.description ?? item.altText ?? item.alt),
    bytes: Number.isFinite(Number(item.bytes)) ? Number(item.bytes) : null,
    dados: {
      legacy: item,
      publicId,
    },
    height: Number.isFinite(Number(item.height)) ? Number(item.height) : null,
    ordem: index,
    storage_path: publicId,
    url,
    width: Number.isFinite(Number(item.width)) ? Number(item.width) : null,
  };
}

function mapFichaRow(row, clienteId) {
  return {
    abertura_lateral: emptyToNull(row.abertura_lateral),
    acabamento_gola: normalizeOptionLabel(row.acabamento_gola, ACABAMENTO_GOLA_LABELS),
    acabamento_manga: normalizeOptionLabel(row.acabamento_manga, ACABAMENTO_MANGA_LABELS),
    arte: emptyToNull(row.arte),
    bolso: normalizeOptionLabel(row.bolso, BOLSO_LABELS),
    cliente_auxiliar: emptyToNull(row.cliente_auxiliar),
    cliente_id: clienteId,
    cliente_nome_snapshot: emptyToNull(row.cliente) ?? "Cliente sem nome",
    com_nomes: Number.isFinite(Number(row.com_nomes)) ? Number(row.com_nomes) : null,
    composicao: emptyToNull(row.composicao),
    cor_abertura_lateral: emptyToNull(row.cor_abertura_lateral),
    cor_acabamento_manga: emptyToNull(row.cor_acabamento_manga),
    cor_botao: emptyToNull(row.cor_botao),
    cor_gola: emptyToNull(row.cor_gola),
    cor_material: emptyToNull(row.cor_material),
    cor_pe_de_gola_externo: emptyToNull(row.cor_pe_de_gola_externo),
    cor_pe_de_gola_interno: emptyToNull(row.cor_pe_de_gola_interno),
    cor_peitilho_externo: emptyToNull(row.cor_peitilho_externo),
    cor_peitilho_interno: emptyToNull(row.cor_peitilho_interno),
    cor_reforco: emptyToNull(row.cor_reforco),
    cor_sublimacao: emptyToNull(row.cor_sublimacao),
    data_entrega: normalizeDate(row.data_entrega) ?? normalizeDate(row.data_inicio) ?? new Date().toISOString().slice(0, 10),
    data_inicio: normalizeDate(row.data_inicio),
    delivered_at: normalizeTimestamp(row.data_entregue),
    evento: String(row.evento ?? "").trim().toLowerCase() === "sim",
    faixa: emptyToNull(row.faixa),
    faixa_cor: emptyToNull(row.faixa_cor),
    faixa_local: emptyToNull(row.faixa_local),
    filete: emptyToNull(row.filete),
    filete_cor: emptyToNull(row.filete_cor),
    filete_local: emptyToNull(row.filete_local),
    gola: normalizeOptionLabel(row.gola, GOLA_LABELS),
    insumo_status: normalizeInsumoStatus(row.supply_status),
    kanban_status: normalizeKanbanStatus(row.kanban_status),
    largura_gola: emptyToNull(row.largura_gola),
    largura_manga: emptyToNull(row.largura_manga),
    legacy_ficha_id: Number(row.id),
    manga: emptyToNull(row.manga),
    material: emptyToNull(row.material),
    metadados: {
      importedFrom: "turso",
      legacyCreatedAt: row.data_criacao ?? null,
      legacyUpdatedAt: row.data_atualizacao ?? null,
      manualCard: Boolean(row.is_manual_card),
    },
    numero_venda: emptyToNull(row.numero_venda),
    observacoes: emptyToNull(row.observacoes),
    reforco_gola: emptyToNull(row.reforco_gola),
    status: normalizeStatus(row.status),
    vendedor: emptyToNull(row.vendedor),
  };
}

async function fetchLegacyRows(db) {
  const result = await db.execute({
    sql: `select * from fichas where coalesce(is_manual_card, 0) = 0 order by id asc${limit ? " limit ?" : ""}`,
    args: limit ? [limit] : [],
  });

  return result.rows;
}

async function upsertCliente(supabase, ficha) {
  const nome = emptyToNull(ficha.cliente) ?? "Cliente sem nome";
  const primeiraFicha = normalizeDate(ficha.data_inicio) ?? normalizeDate(ficha.data_entrega);
  const ultimaFicha = normalizeDate(ficha.data_entrega) ?? primeiraFicha;
  const { data, error } = await supabase
    .from("clientes")
    .upsert(
      {
        nome,
        primeira_ficha: primeiraFicha,
        ultima_ficha: ultimaFicha,
      },
      { onConflict: "nome_normalizado" },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function upsertFicha(supabase, row, clienteId) {
  const { data, error } = await supabase
    .from("fichas")
    .upsert(mapFichaRow(row, clienteId), { onConflict: "legacy_ficha_id" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function replaceFichaChildren(supabase, fichaId, row) {
  const produtos = parseJsonArray(row.produtos).map(normalizeProdutoItem);
  const imagens = parseJsonArray(row.imagens_data).map(normalizeImagemItem).filter(Boolean);

  await supabase.from("ficha_itens").delete().eq("ficha_id", fichaId).throwOnError();
  await supabase.from("ficha_imagens").delete().eq("ficha_id", fichaId).throwOnError();

  if (produtos.length > 0) {
    await supabase
      .from("ficha_itens")
      .insert(produtos.map((item) => ({ ...item, ficha_id: fichaId })))
      .throwOnError();
  }

  if (imagens.length > 0) {
    await supabase
      .from("ficha_imagens")
      .insert(imagens.map((image) => ({ ...image, ficha_id: fichaId })))
      .throwOnError();
  }

  return {
    imagens: imagens.length,
    produtos: produtos.length,
  };
}

async function recalculateClientes(supabase) {
  const { data: clientes, error } = await supabase.from("clientes").select("id");
  if (error) throw error;

  for (const cliente of clientes ?? []) {
    const { data: fichas, error: fichasError } = await supabase
      .from("fichas")
      .select("data_entrega")
      .eq("cliente_id", cliente.id)
      .order("data_entrega", { ascending: true });

    if (fichasError) throw fichasError;

    await supabase
      .from("clientes")
      .update({
        primeira_ficha: fichas?.[0]?.data_entrega ?? null,
        ultima_ficha: fichas?.[fichas.length - 1]?.data_entrega ?? null,
        total_fichas: fichas?.length ?? 0,
      })
      .eq("id", cliente.id)
      .throwOnError();
  }
}

async function main() {
  const legacyDb = createLibsqlClient({
    authToken: requiredEnv("TURSO_AUTH_TOKEN"),
    url: requiredEnv("TURSO_DATABASE_URL"),
  });
  const rows = await fetchLegacyRows(legacyDb);
  const totals = rows.reduce(
    (acc, row) => {
      acc.produtos += parseJsonArray(row.produtos).length;
      acc.imagens += parseJsonArray(row.imagens_data).filter((item) => normalizeImagemItem(item, 0)).length;
      return acc;
    },
    { fichas: rows.length, imagens: 0, produtos: 0 },
  );

  console.log(`[legacy-import] Modo: ${shouldApply ? "apply" : "dry-run"}`);
  console.log(`[legacy-import] Fichas encontradas: ${totals.fichas}`);
  console.log(`[legacy-import] Produtos mapeáveis: ${totals.produtos}`);
  console.log(`[legacy-import] Imagens Cloudinary mapeáveis: ${totals.imagens}`);

  if (!shouldApply) {
    console.log("[legacy-import] Nenhum dado foi gravado. Use --apply para importar.");
    return;
  }

  const supabase = createSupabaseClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
    },
  });
  let imported = 0;
  let childProdutos = 0;
  let childImagens = 0;

  for (const row of rows) {
    const clienteId = await upsertCliente(supabase, row);
    const fichaId = await upsertFicha(supabase, row, clienteId);
    const children = await replaceFichaChildren(supabase, fichaId, row);
    imported += 1;
    childProdutos += children.produtos;
    childImagens += children.imagens;
  }

  await recalculateClientes(supabase);

  console.log(`[legacy-import] Fichas importadas: ${imported}`);
  console.log(`[legacy-import] Produtos importados: ${childProdutos}`);
  console.log(`[legacy-import] Imagens importadas: ${childImagens}`);
}

main().catch((error) => {
  console.error("[legacy-import] Falha na importação:", error);
  process.exitCode = 1;
});
