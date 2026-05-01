import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
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

function buildCatalogItems() {
  const legacy = loadLegacyCatalog();
  const items = [];

  (legacy.produtos ?? []).forEach((name, index) => items.push(createItem("produto", name, index)));
  (legacy.tamanhos ?? []).forEach((name, index) => items.push(createItem("tamanho", name, index)));
  (legacy.cores ?? []).forEach((name, index) => items.push(createItem("cor", name, index)));
  (legacy.coresBotao ?? []).forEach((name, index) =>
    items.push(createItem("cor", name, index + 1000, { aliases: ["botão"] })),
  );
  (legacy.mangas ?? []).forEach((name, index) => items.push(createItem("manga", name, index)));
  (legacy.materiais ?? []).forEach((material, index) =>
    items.push(
      createItem("tecido", material.nome, index, {
        metadata: {
          composition: material.composicao,
          legacyId: material.id,
        },
      }),
    ),
  );

  ["Sem bolso", "Bolso comum", "Bolso chapado", "Bolso com lapela", "Bolso embutido"].forEach((name, index) =>
    items.push(createItem("bolso", name, index)),
  );
  ["Curta", "Longa", "Raglan", "Regata", "3/4"].forEach((name, index) => items.push(createItem("manga", name, index + 100)));
  ["Punho", "Viés", "Barra simples", "Punho ribana", "Viés sublimado"].forEach((name, index) =>
    items.push(createItem("acabamento_manga", name, index)),
  );
  ["Redonda", "V", "Polo", "Social", "Padre"].forEach((name, index) => items.push(createItem("gola", name, index)));
  ["Ribana", "Viés", "Polo", "Social", "Gola pronta"].forEach((name, index) =>
    items.push(createItem("acabamento_gola", name, index)),
  );

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

  console.log("[catalog-seed] Catálogos importados com sucesso.");
}

main().catch((error) => {
  console.error("[catalog-seed] Falha ao importar catálogos:", error);
  process.exitCode = 1;
});
