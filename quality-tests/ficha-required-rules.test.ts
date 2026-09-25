import assert from "node:assert/strict";
import test from "node:test";
import { isMissingRequiredLayout } from "../src/features/fichas/print-requirements.ts";
import { getMissingConditionalFields } from "../src/features/fichas/schema.ts";

test("acabamento da manga e largura da gola são obrigatórios só quando visíveis", () => {
  assert.deepEqual(getMissingConditionalFields({ acabamentoGola: "Ribana", gola: "Careca", produtos: ["Camiseta"] }), ["acabamentoManga", "larguraGola"]);
  assert.deepEqual(getMissingConditionalFields({ acabamentoManga: "Bainha", acabamentoGola: "Ribana", gola: "Careca", larguraGola: "2,5", produtos: ["Camiseta"] }), []);
  assert.deepEqual(getMissingConditionalFields({ produtos: ["Regata"] }), []);
  assert.deepEqual(getMissingConditionalFields({ acabamentoGola: "Ribana", acabamentoManga: "Punho", gola: "Polo", produtos: ["Camisa Polo"] }), []);
  assert.deepEqual(getMissingConditionalFields({ acabamentoManga: "Punho", produtos: ["Camiseta"] }), []);
});

test("manga curta e longa exige acabamento da manga longa", () => {
  assert.deepEqual(getMissingConditionalFields({ acabamentoManga: "Barra", manga: "Curta e Longa", produtos: ["Camiseta"] }), ["acabamentoMangaLonga"]);
  assert.deepEqual(getMissingConditionalFields({ acabamentoManga: "Barra", acabamentoMangaLonga: "Punho", manga: "curta e longa", produtos: ["Camiseta"] }), []);
  assert.deepEqual(getMissingConditionalFields({ acabamentoManga: "Barra", manga: "Longa", produtos: ["Camiseta"] }), []);
  assert.deepEqual(getMissingConditionalFields({ manga: "Curta e Longa", produtos: ["Regata"] }), []);
});

test("impressão exige layout, exceto sem personalização", () => {
  assert.equal(isMissingRequiredLayout("serigrafia", 0), true);
  assert.equal(isMissingRequiredLayout(null, 0), true);
  assert.equal(isMissingRequiredLayout("serigrafia", 1), false);
  assert.equal(isMissingRequiredLayout("sem_personalizacao", 0), false);
  assert.equal(isMissingRequiredLayout("Sem Personalização", 0), false);
});
