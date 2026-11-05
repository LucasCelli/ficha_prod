import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { catalogKindLabels, catalogKinds } from "../src/features/catalogos/types.ts";
import { createManualKanbanCardSchema } from "../src/features/quadro-producao/schema.ts";

test("personalizações fazem parte do catálogo editável", async () => {
  assert.ok(catalogKinds.includes("personalizacao"));
  assert.equal(catalogKindLabels.personalizacao, "Personalizações");

  const enumMigration = await readFile(
    new URL("../supabase/migrations/20261105225931_add_catalog_personalizacoes.sql", import.meta.url),
    "utf8",
  );
  const seedMigration = await readFile(
    new URL("../supabase/migrations/20261105225942_seed_catalog_personalizacoes.sql", import.meta.url),
    "utf8",
  );

  assert.match(enumMigration, /add value if not exists 'personalizacao'/);
  assert.match(seedMigration, /'sem_personalizacao'/);
  assert.match(seedMigration, /'serigrafia_bordado'/);
  assert.match(seedMigration, /"canonicalValue"/);

  const fichaForm = await readFile(new URL("../src/features/fichas/ficha-form.tsx", import.meta.url), "utf8");
  const fichaFilter = await readFile(new URL("../src/features/fichas/fichas-filter-toolbar.tsx", import.meta.url), "utf8");
  const kanbanClient = await readFile(new URL("../src/features/quadro-producao/quadro-producao-client.tsx", import.meta.url), "utf8");

  assert.match(fichaForm, /personalizacaoOptions\.map/);
  assert.match(fichaFilter, /personalizacaoOptions\.map/);
  assert.match(kanbanClient, /catalogPersonalizacaoOptions\.map/);
});

test("cartão manual aceita personalizações novas do catálogo", () => {
  const result = createManualKanbanCardSchema.safeParse({
    arte: "laser_textil",
    columnId: "1c644f92-2d12-4e15-b8f1-a6db25098383",
    dataEntrega: "2026-11-05",
    evento: false,
    material: "Dry Fit",
    title: "Pedido personalizado",
  });

  assert.equal(result.success, true);
});
