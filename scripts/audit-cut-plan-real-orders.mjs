import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { calculateCutPlanAlternatives } from "../src/features/plano-de-corte/alternatives.ts";
import { getDefaultMaximumFrequency, getLayerLimit } from "../src/features/plano-de-corte/dimensions.ts";
import { resolveItemGarmentSize, resolveItemModelSize, resolveItemSleeveType } from "../src/features/plano-de-corte/ficha-item-classification.ts";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase não configurado em .env.local.");

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const [{ data: catalog, error: catalogError }, { data: orders, error: orderError }] = await Promise.all([
  supabase.from("catalog_items").select("id,kind,name,aliases,fabric_type,fabric_width_cm,measure_back_height_cm,measure_back_width_cm,measure_front_height_cm,measure_front_width_cm,measure_long_sleeve_height_cm,measure_long_sleeve_width_cm,measure_short_sleeve_height_cm,measure_short_sleeve_width_cm").eq("active", true),
  supabase.from("fichas").select("id,material,manga,ficha_itens(produto,descricao,detalhes,detalhes_produto,tamanho,quantidade)").order("created_at", { ascending: false }).limit(60),
]);
if (catalogError) throw catalogError;
if (orderError) throw orderError;

const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().trim();
const fabrics = (catalog ?? []).filter((item) => item.kind === "tecido" && item.fabric_type && item.fabric_width_cm);
const fabricByName = new Map(fabrics.flatMap((item) => [item.name, ...(item.aliases ?? [])].map((name) => [normalize(name), item])));
const dimensions = ["measure_back_height_cm", "measure_back_width_cm", "measure_front_height_cm", "measure_front_width_cm", "measure_long_sleeve_height_cm", "measure_long_sleeve_width_cm", "measure_short_sleeve_height_cm", "measure_short_sleeve_width_cm"];
const sizeProfiles = (catalog ?? []).filter((item) => item.kind === "tamanho" && dimensions.every((field) => Number(item[field]) > 0)).map((item) => ({
  id: item.id, size: item.name, aliases: item.aliases ?? [], backHeightCm: item.measure_back_height_cm, backWidthCm: item.measure_back_width_cm,
  frontHeightCm: item.measure_front_height_cm, frontWidthCm: item.measure_front_width_cm, longSleeveHeightCm: item.measure_long_sleeve_height_cm,
  longSleeveWidthCm: item.measure_long_sleeve_width_cm, shortSleeveHeightCm: item.measure_short_sleeve_height_cm, shortSleeveWidthCm: item.measure_short_sleeve_width_cm,
}));

const audited = [];
const skipped = { noFabricConfig: 0, noItems: 0, calculation: 0 };
const auditedByType = { TUBULAR: 0, PLANO: 0 };
for (const order of orders ?? []) {
  const fabricConfig = fabricByName.get(normalize(order.material));
  if (!fabricConfig) { skipped.noFabricConfig += 1; continue; }
  const grouped = new Map();
  for (const item of order.ficha_itens ?? []) {
    if (!item.tamanho?.trim() || item.quantidade <= 0) continue;
    const description = [item.produto, item.descricao, item.detalhes_produto, item.detalhes].filter(Boolean).join(" ");
    const size = resolveItemGarmentSize(resolveItemModelSize(item.tamanho.trim().toUpperCase(), description), description);
    const sleeveType = resolveItemSleeveType(description, order.manga);
    const demandKey = `${size}\u001f${sleeveType}`;
    grouped.set(demandKey, { size, sleeveType, quantity: (grouped.get(demandKey)?.quantity ?? 0) + item.quantidade });
  }
  if (!grouped.size) { skipped.noItems += 1; continue; }
  const type = fabricConfig.fabric_type;
  if (auditedByType[type] >= 10) continue;
  const input = {
    tableLengthCm: 800, maxLayers: getLayerLimit(type), maxFrequency: getDefaultMaximumFrequency(type), sizeProfiles,
    fabrics: [{ id: "fabric", name: fabricConfig.name, color: "", widthCm: fabricConfig.fabric_width_cm, type }],
    items: [...grouped.values()].map((item, index) => ({ id: `item-${index}`, fabricId: "fabric", ...item })),
  };
  try {
    const alternatives = calculateCutPlanAlternatives(input);
    const valid = alternatives.every((alternative) => alternative.result.fabrics[0].sizes.every((size) => size.produced >= size.requested));
    audited.push({ type, variants: grouped.size, pieces: [...grouped.values()].reduce((sum, item) => sum + item.quantity, 0), layCounts: alternatives.map((item) => item.layCount), valid });
    auditedByType[type] += 1;
  } catch {
    skipped.calculation += 1;
  }
}

const summary = {
  sampled: orders?.length ?? 0,
  audited: audited.length,
  valid: audited.filter((item) => item.valid).length,
  byType: Object.fromEntries(["TUBULAR", "PLANO"].map((type) => [type, audited.filter((item) => item.type === type).length])),
  multiSize: audited.filter((item) => item.variants > 1).length,
  large: audited.filter((item) => item.pieces >= 50).length,
  withIntermediateAlternative: audited.filter((item) => new Set(item.layCounts).size > 1).length,
  skipped,
};
console.log(JSON.stringify(summary, null, 2));
if (summary.valid !== summary.audited) process.exitCode = 1;
