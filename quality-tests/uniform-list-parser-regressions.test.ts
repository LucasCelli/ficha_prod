import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseStructuredUniformListInput, parseVerticalUniformListInput } from "../src/lib/ai/uniform-list-structured-input.ts";

test("JSON input preserves exact row count, empty names, and per-row sizes", () => {
  const parsed = parseStructuredUniformListInput(JSON.stringify([
    { Nome: "WESLEN", Tamanho: "P" },
    { Nome: "WESLEN", Tamanho: "P" },
    { Nome: "", Tamanho: "M" },
    { Nome: "SEM NOME", Tamanho: "G" },
    { Tamanho: "G" },
  ]));

  assert.deepEqual(parsed?.items.map(({ nome, tamanho }) => ({ nome, tamanho })), [
    { nome: "WESLEN", tamanho: "P" },
    { nome: "WESLEN", tamanho: "P" },
    { nome: null, tamanho: "M" },
    { nome: null, tamanho: "G" },
    { nome: null, tamanho: "G" },
  ]);
});

test("vertical size headings apply to every following name until the next size", () => {
  const source = "MANGA LONGA:\nM\nGARDENYA\nWESLEN\nJACIARA\nG\nQRA KAKAROTTO\nFABIANA\nGG\nADAGMAR\nJHONY";
  const parsed = parseVerticalUniformListInput(source);

  assert.deepEqual(parsed?.items.map(({ tamanho }) => tamanho), ["M", "M", "M", "G", "G", "GG", "GG"]);
  assert.ok(parsed?.items.every(({ grupo }) => grupo === "MANGA LONGA"));
});

test("vertical lists preserve duplicate names and every nameless occurrence", () => {
  const parsed = parseVerticalUniformListInput("G\nLUCAS OLIVEIRA\nLUCAS OLIVEIRA\nGEOVANA\nLUIS\nMAURO\nSEM NOME\nSEM NOME\nLETICIA\nMARCOS\nSEM NOME");

  assert.equal(parsed?.items.length, 10);
  assert.deepEqual(parsed?.items.map(({ nome }) => nome), [
    "LUCAS OLIVEIRA", "LUCAS OLIVEIRA", "GEOVANA", "LUIS", "MAURO", null, null, "LETICIA", "MARCOS", null,
  ]);
  assert.ok(parsed?.items.every(({ tamanho }) => tamanho === "G"));
});

test("prompt explicitly guards the reported failure modes", () => {
  const promptSource = readFileSync(new URL("../src/lib/ai/prompts/uniform-list.ts", import.meta.url), "utf8");
  assert.match(promptSource, /Cada objeto de entrada representa exatamente um item/u);
  assert.match(promptSource, /linha contendo SOMENTE um tamanho valido/u);
  assert.match(promptSource, /NAO encerra a secao/u);
  assert.match(promptSource, /mantenha duplicidades que existam na entrada/u);
  assert.match(promptSource, /tres itens distintos com nome null/u);
});
