import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { catalogPrintEntrySchema, catalogPrintReviewSchema } from "../src/features/catalogo-impresso/schema.ts";

const migration = readFileSync("supabase/migrations/202611060001_catalogo_impresso.sql", "utf8");
const pdf = readFileSync("src/features/catalogo-impresso/pdf.ts", "utf8");
const publishRoute = readFileSync("src/app/api/catalogo-impresso/publicar/route.ts", "utf8");
const actions = readFileSync("src/features/catalogo-impresso/actions.ts", "utf8");
const formState = readFileSync("src/features/catalogo-impresso/form-state.ts", "utf8");
const adminOverview = readFileSync("src/features/catalogo-impresso/admin-overview.tsx", "utf8");

const image = { altText: "Frente", url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" };
const entry = { active: "on", categoryId: "d31c8a7a-fc58-4b39-89ab-03c476ecdcad", description: "", highlights: "Leve\nResistente", id: "", images: [image], section: "produto", sortOrder: "1", sourceFichaId: "", title: "Camiseta" };

test("artigo exige imagem e limita imagens e destaques", () => {
  assert.equal(catalogPrintEntrySchema.safeParse(entry).success, true);
  assert.equal(catalogPrintEntrySchema.safeParse({ ...entry, images: [] }).success, false);
  assert.equal(catalogPrintEntrySchema.safeParse({ ...entry, images: Array(5).fill(image) }).success, false);
  assert.equal(catalogPrintEntrySchema.safeParse({ ...entry, highlights: Array(9).fill("Item").join("\n") }).success, false);
});

test("ignorar ficha exige motivo e revisar não exige", () => {
  const fichaId = "c5ed9eaf-57c9-4446-8cdb-53a16ec4f2af";
  assert.equal(catalogPrintReviewSchema.safeParse({ fichaId, status: "ignorada", reason: "" }).success, false);
  assert.equal(catalogPrintReviewSchema.safeParse({ fichaId, status: "revisada", reason: "" }).success, true);
});

test("catálogo comercial tem armazenamento privado e troca de ponteiro após o upload", () => {
  assert.match(migration, /catalog_print_entries/);
  assert.match(migration, /values \('catalogo-impresso', 'catalogo-impresso', false/);
  assert.match(publishRoute, /storage\.from\("catalogo-impresso"\)\.upload/);
  assert.ok(publishRoute.indexOf(".upload(") < publishRoute.indexOf("latest_publication_id"));
  assert.match(publishRoute, /A versão anterior foi mantida/);
});

test("PDF usa somente campos comerciais e reserva uma página por artigo", () => {
  assert.match(pdf, /for \(let index = 0; index < entries\.length; index \+= 1\)[\s\S]+?doc\.addPage\(\)[\s\S]+?drawArticle/);
  assert.doesNotMatch(pdf, /cliente_nome_snapshot|numero_venda|vendedor|data_entrega|quantidade|preço|price/i);
  assert.match(pdf, /Sumário/);
  assert.match(pdf, /drawBackCover/);
});

test("arquivo de server actions exporta somente funcoes assincronas", () => {
  assert.match(actions, /^"use server";/);
  assert.doesNotMatch(actions, /^export (?:const|let|var|type|interface|class) /m);
  assert.match(formState, /export const initialCatalogPrintActionState/);
});

test("categorias e artigos usam ordenacao por drag and drop", () => {
  assert.match(actions, /export async function reorderCatalogPrintCategoriesAction/);
  assert.match(actions, /export async function reorderCatalogPrintEntriesAction/);
  assert.match(adminOverview, /DragDropProvider/);
  assert.match(adminOverview, /SortableHandle/);
  assert.doesNotMatch(adminOverview, /<span>Ordem<\/span>/);
});
