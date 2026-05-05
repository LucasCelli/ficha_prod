import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueByKindSlug(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.kind}:${item.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = slugify(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createItem(kind, name, index, extra = {}) {
  return {
    active: true,
    aliases: extra.aliases ?? [],
    description: extra.description ?? null,
    kind,
    metadata: extra.metadata ?? {},
    name,
    slug: slugify(name),
    sort_order: index,
  };
}

function loadLegacyCatalog() {
  const filePath = path.join(process.cwd(), "public", "data", "catalogo.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getCanonicalBolsos() {
  return [
    "Sem bolso",
    "Bolso no Peito",
    "2 Bolsos na Frente",
    "2 Bolsos Traseiros",
    "1 Bolso Traseiro",
    "2 Bolsos na Frente e 2 Atras",
    "2 Bolsos na Frente e 1 Atras",
    "Bolsos na Frente Embutidos",
    "Bolsos na Frente Externos",
  ];
}

function getCanonicalGolas() {
  return [
    { aliases: ["redonda"], name: "Gola Redonda" },
    { aliases: ["v"], name: "Gola V" },
    { aliases: ["polo"], name: "Gola Polo" },
    { aliases: ["social"], name: "Gola Social" },
    { aliases: ["padre_ziper", "padre"], name: "Gola Padre com Ziper" },
    { aliases: ["padre_esportiva"], name: "Gola Padre Esportiva" },
    { aliases: ["v_polo"], name: "Gola V Polo" },
    { aliases: ["canoa"], name: "Gola Canoa" },
  ];
}

function getCanonicalAcabamentosManga() {
  return [
    { aliases: ["barra"], name: "Barra" },
    { aliases: ["punho"], name: "Punho" },
    { aliases: ["punho_ribana"], name: "Punho de Ribana" },
    { aliases: ["punho_vies_sublimado"], name: "Punho Sublimado" },
    { aliases: ["vies"], name: "Vies" },
    { aliases: ["vies_sublimado"], name: "Vies Sublimado" },
  ];
}

function getCanonicalAcabamentosGola() {
  return [
    { aliases: ["ribana"], name: "Ribana" },
    { aliases: ["vies"], name: "Vies" },
    { aliases: ["vies_sublimado"], name: "Vies Sublimado" },
    { aliases: ["ribana_sublimada"], name: "Ribana Sublimada" },
    { aliases: ["ribana_molde"], name: "Ribana em Molde" },
  ];
}

function buildCatalogItems() {
  const legacy = loadLegacyCatalog();
  const items = [];

  (legacy.produtos ?? []).forEach((name, index) => {
    items.push(createItem("produto", name, index));
  });

  (legacy.tamanhos ?? []).forEach((name, index) => {
    items.push(createItem("tamanho", name, index));
  });

  dedupeStrings([...(legacy.cores ?? []), ...(legacy.coresBotao ?? [])]).forEach((name, index) => {
    items.push(createItem("cor", name, index));
  });

  (legacy.mangas ?? []).forEach((name, index) => {
    items.push(createItem("manga", name, index));
  });

  (legacy.materiais ?? []).forEach((material, index) => {
    items.push(
      createItem("tecido", material.nome, index, {
        aliases: [material.id],
        metadata: {
          composition: material.composicao,
          legacyId: material.id,
        },
      }),
    );
  });

  getCanonicalBolsos().forEach((name, index) => {
    items.push(createItem("bolso", name, index));
  });

  getCanonicalAcabamentosManga().forEach((item, index) => {
    items.push(createItem("acabamento_manga", item.name, index, { aliases: item.aliases }));
  });

  getCanonicalGolas().forEach((item, index) => {
    items.push(createItem("gola", item.name, index, { aliases: item.aliases }));
  });

  getCanonicalAcabamentosGola().forEach((item, index) => {
    items.push(createItem("acabamento_gola", item.name, index, { aliases: item.aliases }));
  });

  return uniqueByKindSlug(items);
}

async function main() {
  const items = buildCatalogItems();
  const totalsByKind = items.reduce((totals, item) => {
    totals[item.kind] = (totals[item.kind] ?? 0) + 1;
    return totals;
  }, {});

  console.log(`[catalog-seed] Modo: ${shouldApply ? "apply" : "dry-run"}`);
  console.log(`[catalog-seed] Itens mapeados: ${items.length}`);
  Object.entries(totalsByKind)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([kind, total]) => console.log(`[catalog-seed] ${kind}: ${total}`));

  if (!shouldApply) {
    console.log("[catalog-seed] Nenhum dado foi gravado. Use --apply para inserir/atualizar.");
    return;
  }

  const supabase = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
    },
  });
  const { error } = await supabase.from("catalog_items").upsert(items, { onConflict: "kind,slug" });

  if (error) throw error;

  console.log("[catalog-seed] Catalogos importados com sucesso.");
}

main().catch((error) => {
  console.error("[catalog-seed] Falha ao importar catalogos:", error);
  process.exitCode = 1;
});
