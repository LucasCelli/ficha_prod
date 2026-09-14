import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { buildSizeProfileIndex, calculateMarkerAreaLengthCm, calculateShirtAreaCm2, ESTIMATED_NESTING_EFFICIENCY, estimateMarkerLengthCm, formatEstimatedLengthMeters, getDefaultMaximumFrequency, getLayerLimit, getMaximumEstimatedFrequency, normalizeCutPlanSizeKey } from "../src/features/plano-de-corte/dimensions.ts";
import { cutPlanDemandKey, type CutPlanSizeProfile, type FabricType } from "../src/features/plano-de-corte/model.ts";
import { solveMinimumLays } from "../src/features/plano-de-corte/solver.ts";
import { calculateCutPlan, formatCutPlanItemType, formatCutPlanSizeLabel, formatMarkerLabel, formatOperationalMarkerLabel } from "../src/features/plano-de-corte/calculator.ts";
import { calculateCutPlanAlternatives } from "../src/features/plano-de-corte/alternatives.ts";
import { validateCutPlan } from "../src/features/plano-de-corte/validation.ts";
import { moveCutPlanItem } from "../src/features/plano-de-corte/item-order.ts";
import type { CutPlanInput } from "../src/features/plano-de-corte/model.ts";

// Estes casos históricos comparam explicitamente o domínio de frequências até 8.
const unconstrained = { tableLengthCm: 100_000, fabricWidthCm: 118, sizeProfiles: [], maxFrequency: 8 };

test("aplica os limites fisicos de folhas por tipo", () => {
  assert.equal(getLayerLimit("PLANO"), 100);
  assert.equal(getLayerLimit("TUBULAR"), 50);
  assert.equal(getDefaultMaximumFrequency("TUBULAR"), 14);
  assert.equal(getDefaultMaximumFrequency("PLANO"), 8);
});

test("reordena produtos por id estavel e ignora destinos que desapareceram", () => {
  const input = createInput("TUBULAR", 50);
  const items = [
    { ...input.items[0], id: "a", size: "P" },
    { ...input.items[0], id: "b", size: "M" },
    { ...input.items[0], id: "c", size: "G" },
  ];

  assert.deepEqual(moveCutPlanItem(items, "a", "c").map(({ id }) => id), ["b", "c", "a"]);
  assert.equal(moveCutPlanItem(items, "a", "removed"), items);
  assert.equal(moveCutPlanItem(items, "removed", "b"), items);
});

test("formata o comprimento estimado em metros com uma casa decimal", () => {
  assert.equal(formatEstimatedLengthMeters(589), "5,9 metros");
  assert.equal(formatEstimatedLengthMeters(500), "5,0 metros");
});

test("omite a manga na grade unica e preserva na grade mista", () => {
  const frequencies = [
    { size: "P", sleeveType: "CURTA" as const, frequency: 2 },
    { size: "M", sleeveType: "LONGA" as const, frequency: 4 },
  ];
  assert.equal(formatMarkerLabel(frequencies, false), "2-P + 4-M");
  assert.equal(formatMarkerLabel(frequencies, true), "2-P MC + 4-M ML");
  assert.equal(formatOperationalMarkerLabel(frequencies, false), "2-P, 4-M");
  assert.equal(formatOperationalMarkerLabel(frequencies, true), "2-P MC, 4-M ML");
});

test("formato operacional separa frequência de tamanhos numéricos", () => {
  assert.equal(formatOperationalMarkerLabel([
    { size: "14", sleeveType: "CURTA", frequency: 2 },
    { size: "EEGG (58)", sleeveType: "CURTA", frequency: 2 },
  ], false), "2-14, 2-EEGG (58)");
});

test("apresenta o tipo da peca em vez de manga curta para itens inferiores", () => {
  assert.equal(formatCutPlanItemType("CALÇA G", "CURTA"), "Calça");
  assert.equal(formatCutPlanItemType("SHORT M", "CURTA"), "Short/Bermuda");
  assert.equal(formatCutPlanItemType("BERMUDA M", "CURTA"), "Short/Bermuda");
  assert.equal(formatCutPlanItemType("G", "CURTA"), "Curta");
  assert.equal(formatCutPlanItemType("G", "LONGA"), "Longa");
});

test("agrupa short e bermuda como a mesma categoria operacional", () => {
  const input = createInput("TUBULAR", 50);
  input.items = [
    { id: "short-g", fabricId: "fabric", size: "SHORT G", sleeveType: "CURTA", quantity: 6 },
    { id: "bermuda-g", fabricId: "fabric", size: "BERMUDA G", sleeveType: "CURTA", quantity: 8 },
  ];

  const result = calculateCutPlan(input).fabrics[0];
  assert.deepEqual(result.sizes.map(({ size, requested, produced }) => ({ size, requested, produced })), [
    { size: "SHORT G", requested: 14, produced: 14 },
  ]);
});

test("abrevia Baby Look como BL na apresentação", () => {
  assert.equal(formatCutPlanSizeLabel("P"), "P");
  assert.equal(formatCutPlanSizeLabel("BABY PP"), "BL PP");
  assert.equal(formatCutPlanSizeLabel("P", "DRESS_SHIRT"), "MASC. P");
  assert.equal(formatCutPlanSizeLabel("BABY PP", "DRESS_SHIRT"), "FEM. PP");
  assert.equal(formatCutPlanSizeLabel("FEM P"), "FEM. P");
  assert.equal(formatCutPlanSizeLabel("MASC P"), "MASC. P");
  assert.equal(formatMarkerLabel([{ size: "BABY PP", sleeveType: "CURTA", frequency: 2 }], false), "2-BL PP");
  assert.equal(formatMarkerLabel([
    { size: "P", sleeveType: "CURTA", frequency: 2 },
    { size: "M", sleeveType: "CURTA", frequency: 2 },
    { size: "BABY M", sleeveType: "CURTA", frequency: 2 },
    { size: "G", sleeveType: "CURTA", frequency: 4 },
    { size: "GG", sleeveType: "CURTA", frequency: 2 },
  ], false), "2-P + 2-M + 4-G + 2-GG + 2-BL M");
});

test("eficiencia estimada acompanha o mapa tubular real de 118 por 836,32 cm", () => {
  // A area informada pelo Audaces soma as duas faces do tubular; o marcador
  // ocupa uma largura geometrica de 118 cm, portanto comparamos metade dela.
  const realUtilization = (16.15 * 10_000 / 2) / (118 * 836.32);
  assert.ok(Math.abs(realUtilization - ESTIMATED_NESTING_EFFICIENCY) < 0.002);
});

test("validacao rejeita folhas acima do limite do tecido", () => {
  const tubular = createInput("TUBULAR", 51);
  const flat = createInput("PLANO", 101);
  assert.ok(validateCutPlan(tubular).some((message) => message.includes("50 folhas")));
  assert.ok(validateCutPlan(flat).some((message) => message.includes("100 folhas")));
});

test("estima frente, costas, tipo de manga, aliases e duplicacao tubular", () => {
  const profile: CutPlanSizeProfile = {
    id: "m",
    size: "M",
    aliases: ["MEDIO"],
    backHeightCm: 70,
    backWidthCm: 50,
    frontHeightCm: 70,
    frontWidthCm: 50,
    longSleeveHeightCm: 60,
    longSleeveWidthCm: 20,
    shortSleeveHeightCm: 25,
    shortSleeveWidthCm: 20,
  };
  const index = buildSizeProfileIndex([profile]);
  const flatShort = estimateMarkerLengthCm([{ size: "medio", sleeveType: "CURTA", frequency: 2 }], "PLANO", 100, index)!;
  const flatLong = estimateMarkerLengthCm([{ size: "M", sleeveType: "LONGA", frequency: 2 }], "PLANO", 100, index)!;
  const tubularShort = estimateMarkerLengthCm([{ size: "M", sleeveType: "CURTA", frequency: 2 }], "TUBULAR", 100, index)!;
  const tubularLong = estimateMarkerLengthCm([{ size: "M", sleeveType: "LONGA", frequency: 2 }], "TUBULAR", 100, index)!;
  const tubularShortDouble = estimateMarkerLengthCm([{ size: "M", sleeveType: "CURTA", frequency: 4 }], "TUBULAR", 100, index)!;
  assert.ok(flatShort > 0);
  assert.ok(flatLong > flatShort);
  assert.equal(calculateShirtAreaCm2(profile, "CURTA"), 8_000);
  assert.equal(calculateMarkerAreaLengthCm(profile, "CURTA", "TUBULAR", 100, 2), flatShort / 2);
  assert.equal(tubularShort, flatShort / 2);
  assert.equal(tubularLong, flatLong / 2);
  assert.equal(tubularShortDouble, flatShort);
  assert.equal(getMaximumEstimatedFrequency("M", "CURTA", "TUBULAR", 100, 300, [profile]), 6);
  assert.equal(getMaximumEstimatedFrequency("M", "CURTA", "PLANO", 100, 300, [profile]), 3);
});

test("separa perfis tradicionais e Baby Look e aceita aliases equivalentes do mesmo perfil", () => {
  const regular: CutPlanSizeProfile = {
    id: "regular-p",
    size: "P",
    aliases: [],
    backHeightCm: 70,
    backWidthCm: 50,
    frontHeightCm: 70,
    frontWidthCm: 50,
    longSleeveHeightCm: 60,
    longSleeveWidthCm: 20,
    shortSleeveHeightCm: 25,
    shortSleeveWidthCm: 20,
  };
  const baby: CutPlanSizeProfile = {
    ...regular,
    id: "baby-p",
    size: "Baby P",
    aliases: ["BL P"],
    backWidthCm: 42,
    frontWidthCm: 42,
  };
  const index = buildSizeProfileIndex([regular, baby]);
  assert.equal(index.get(normalizeCutPlanSizeKey("P"))?.id, "regular-p");
  assert.equal(index.get(normalizeCutPlanSizeKey("Baby P"))?.id, "baby-p");
  assert.equal(index.get(normalizeCutPlanSizeKey("BL P"))?.id, "baby-p");
  assert.equal(index.get(normalizeCutPlanSizeKey("Feminina P"))?.id, "baby-p");

  const input = createInput("PLANO", 20);
  input.sizeProfiles = [regular, baby];
  assert.equal(validateCutPlan(input).some((message) => message.includes("repetido nos perfis")), false);
});

test("continua rejeitando a mesma chave de tamanho em perfis realmente distintos", () => {
  const input = createInput("PLANO", 20);
  const profile: CutPlanSizeProfile = {
    id: "first-p",
    size: "P",
    aliases: [],
    backHeightCm: 70,
    backWidthCm: 50,
    frontHeightCm: 70,
    frontWidthCm: 50,
    longSleeveHeightCm: 60,
    longSleeveWidthCm: 20,
    shortSleeveHeightCm: 25,
    shortSleeveWidthCm: 20,
  };
  input.sizeProfiles = [profile, { ...profile, id: "second-p" }];
  assert.ok(validateCutPlan(input).some((message) => message.includes("repetido nos perfis")));
});

test("mantem combinacoes validas que a poda incorreta por divisores eliminaria", () => {
  const solutions = solveMinimumLays(new Map([["P", 10], ["M", 7]]), 3, "PLANO", 4, unconstrained);
  assert.equal(solutions[0]?.lays.length, 2);
  assert.ok(solutions.some((solution) => solution.lays.map((lay) => lay.layers).join(",") === "3,2"));
});

test("usa o comprimento da mesa para reduzir frequencias", () => {
  const profile: CutPlanSizeProfile = {
    id: "p",
    size: "P",
    aliases: [],
    backHeightCm: 70,
    backWidthCm: 50,
    frontHeightCm: 70,
    frontWidthCm: 50,
    longSleeveHeightCm: 60,
    longSleeveWidthCm: 20,
    shortSleeveHeightCm: 25,
    shortSleeveWidthCm: 20,
  };
  const tableLengthCm = 250;
  const solutions = solveMinimumLays(new Map([["P", 60]]), 10, "PLANO", 6, {
    tableLengthCm,
    fabricWidthCm: 100,
    sizeProfiles: [profile],
  });
  assert.equal(solutions[0]?.lays.length, 3);
  assert.ok(solutions[0]?.lays.every((lay) => (lay.markerLengthCm ?? 0) <= tableLengthCm));
});

test("caso tubular real fecha em dois enfestos com frequencias pares", () => {
  const quantities = new Map([["P", 40], ["M", 60], ["G", 50], ["GG", 30]]);
  const solution = solveMinimumLays(quantities, 30, "TUBULAR", 4, unconstrained)[0];
  assert.equal(solution?.lays.length, 2);
  assert.ok(solution.lays.every((lay) => lay.frequencies.every(({ frequency }) => frequency % 2 === 0)));
});

test("calca usa quatro paineis proporcionais ao tamanho, reduzidos a dois no tubular", () => {
  const index = buildSizeProfileIndex([]);
  const tubular = estimateMarkerLengthCm([{ size: "CALÇA M", sleeveType: "CURTA", frequency: 2 }], "TUBULAR", 100, index)!;
  const flat = estimateMarkerLengthCm([{ size: "CALÇA M", sleeveType: "CURTA", frequency: 2 }], "PLANO", 100, index)!;
  const lengthAt6 = estimateMarkerLengthCm([{ size: "CALÇA M", sleeveType: "CURTA", frequency: 6 }], "TUBULAR", 100, index)!;
  const lengthAt8 = estimateMarkerLengthCm([{ size: "CALÇA M", sleeveType: "CURTA", frequency: 8 }], "TUBULAR", 100, index)!;

  assert.equal(flat, tubular * 2);
  assert.ok(lengthAt6 > tubular);
  assert.ok(lengthAt8 > lengthAt6);
  assert.equal(getMaximumEstimatedFrequency("CALÇA M", "CURTA", "TUBULAR", 100, 800, [], 14), 2);
});

test("calca prioriza frequencia minima e mais folhas", () => {
  const input = createInput("TUBULAR", 50);
  input.items = [{ id: "pants-g", fabricId: "fabric", size: "CALÇA G", sleeveType: "CURTA", quantity: 32 }];
  const result = calculateCutPlan(input).fabrics[0];
  assert.equal(result.lays.length, 1);
  assert.equal(result.lays[0].frequencies[0].frequency, 2);
  assert.equal(result.lays[0].layers, 16);
});

test("short e bermuda usam quatro paineis e entram no limite do marcador", () => {
  const index = buildSizeProfileIndex([]);
  const shortLength = estimateMarkerLengthCm([{ size: "SHORT G", sleeveType: "CURTA", frequency: 4 }], "TUBULAR", 100, index)!;
  const bermudaLength = estimateMarkerLengthCm([{ size: "BERMUDA G", sleeveType: "CURTA", frequency: 4 }], "TUBULAR", 100, index)!;
  assert.equal(shortLength, bermudaLength);
  assert.ok(shortLength > 0);
});

test("prefere um unico enfesto tubular com frequencia 8 quando fecha em mais folhas", () => {
  const quantities = new Map([
    ["G", 24],
    ["GG", 6],
    ["BABY GG", 6],
  ]);
  const solution = solveMinimumLays(quantities, 50, "TUBULAR", 3, { ...unconstrained, maxFrequency: 14 })[0];

  assert.equal(solution?.lays.length, 1);
  assert.equal(solution.lays[0].layers, 3);
  assert.equal(formatMarkerLabel(solution.lays[0].frequencies, false), "8-G + 2-GG + 2-BL GG");
});

test("oferece alternativa intermediaria de dois enfestos com tamanhos pequenos juntos", () => {
  const input = createInput("TUBULAR", 50);
  input.maxFrequency = 14;
  input.items = [
    { id: "g", fabricId: "fabric", size: "G", sleeveType: "CURTA", quantity: 24 },
    { id: "gg", fabricId: "fabric", size: "GG", sleeveType: "CURTA", quantity: 6 },
    { id: "baby-gg", fabricId: "fabric", size: "BABY GG", sleeveType: "CURTA", quantity: 6 },
  ];

  const alternatives = calculateCutPlanAlternatives(input);
  assert.deepEqual(alternatives.slice(0, 2).map(({ layCount }) => layCount), [1, 2]);
  assert.ok(alternatives[1].result.fabrics[0].lays.some((lay) => {
    const sizes = new Set(lay.frequencies.map(({ size }) => size));
    return sizes.has("GG") && sizes.has("BABY GG");
  }));
});

test("respeita a frequencia maxima personalizada no solver", () => {
  const quantities = new Map([["G", 42]]);
  const expanded = solveMinimumLays(quantities, 3, "TUBULAR", 3, { ...unconstrained, maxFrequency: 14 })[0];
  const restricted = solveMinimumLays(quantities, 3, "TUBULAR", 3, { ...unconstrained, maxFrequency: 8 })[0];

  assert.equal(expanded?.lays.length, 1);
  assert.equal(expanded.lays[0].layers, 3);
  assert.equal(expanded.lays[0].frequencies[0].frequency, 14);
  assert.ok(restricted.lays.every((lay) => lay.frequencies.every(({ frequency }) => frequency <= 8)));
});

test("teto de frequencia limita globalmente a soma da grade no enfesto", () => {
  const quantities = new Map([
    [cutPlanDemandKey("P", "LONGA", "DRESS_SHIRT"), 8],
    [cutPlanDemandKey("M", "LONGA", "DRESS_SHIRT"), 8],
  ]);
  const solutions = solveMinimumLays(quantities, 8, "PLANO", 2, { ...unconstrained, maxFrequency: 4 });

  assert.ok(solutions[0]);
  assert.ok(solutions[0].lays.every((lay) => lay.frequencies.reduce((sum, item) => sum + item.frequency, 0) <= 4));
});

test("teto global também limita grades de camiseta", () => {
  const quantities = new Map([
    [cutPlanDemandKey("P", "CURTA", "T_SHIRT"), 8],
    [cutPlanDemandKey("M", "CURTA", "T_SHIRT"), 8],
  ]);
  const solutions = solveMinimumLays(quantities, 8, "PLANO", 2, { ...unconstrained, maxFrequency: 4 });

  assert.ok(solutions[0]);
  assert.ok(solutions[0].lays.every((lay) => lay.frequencies.reduce((sum, item) => sum + item.frequency, 0) <= 4));
});

test("camisa social tem metragem estimada e respeita a mesa", () => {
  const index = buildSizeProfileIndex([]);
  const social = estimateMarkerLengthCm([{ garmentType: "DRESS_SHIRT", size: "M", sleeveType: "LONGA", frequency: 2 }], "PLANO", 150, index);
  const camiseta = estimateMarkerLengthCm([{ garmentType: "T_SHIRT", size: "M", sleeveType: "LONGA", frequency: 2 }], "PLANO", 150, index);

  assert.ok(social !== null && camiseta !== null && social > camiseta);
  assert.equal(getMaximumEstimatedFrequency("M", "LONGA", "PLANO", 150, social - 1, [], 8, "DRESS_SHIRT"), 1);
});

test("formato operacional identifica modelagens de camisa", () => {
  assert.equal(formatOperationalMarkerLabel([
    { garmentType: "DRESS_SHIRT", size: "M", sleeveType: "LONGA", frequency: 2 },
    { garmentType: "T_SHIRT", size: "P", sleeveType: "CURTA", frequency: 1 },
  ], true), "1-P MC, 2-MASC. M SOCIAL ML");
});

test("distribui tamanho infantil tubular entre enfestos existentes", () => {
  const quantities = new Map(Object.entries({
    RN: 6,
    "1": 14,
    "2": 16,
    "4": 8,
    "6": 6,
    "8": 4,
    "10": 4,
    "14": 6,
    P: 4,
    M: 10,
    G: 10,
    GG: 12,
    EG: 6,
  }).map(([size, quantity]) => [cutPlanDemandKey(size, "CURTA"), quantity]));

  const solution = solveMinimumLays(quantities, 50, "TUBULAR", 4, {
    ...unconstrained,
    tableLengthCm: 800,
    maxFrequency: 14,
    additionalLayCounts: 1,
  })[0];

  assert.ok(solution && solution.lays.length < 4);
  const sizeOneLays = solution.lays.filter((lay) => lay.frequencies.some(({ size }) => size === "1"));
  assert.ok(sizeOneLays.length > 0);
  assert.ok(sizeOneLays.every((lay) => lay.frequencies.length > 1));
  assert.equal(sizeOneLays.reduce((total, lay) => {
    const frequency = lay.frequencies.find(({ size }) => size === "1")!.frequency;
    return total + lay.layers * frequency;
  }, 0), 14);
  assert.ok(solution.lays.some((lay) => lay.frequencies.length > 5));
});

test("nao limita artificialmente a quantidade de tamanhos no enfesto", () => {
  const quantities = new Map(["RN", "1", "2", "4", "6", "8", "10"].map((size) => [
    cutPlanDemandKey(size, "CURTA"),
    2,
  ]));

  const solution = solveMinimumLays(quantities, 50, "TUBULAR", 7, {
    ...unconstrained,
    maxFrequency: 14,
  })[0];

  assert.equal(solution?.lays.length, 1);
  assert.equal(solution.lays[0].frequencies.length, 7);
  assert.ok(solution.lays[0].frequencies.every(({ frequency }) => frequency === 2));
});

test("mantem a quantidade importada como pedido ao aumentar o corte manualmente", () => {
  const input = createInput("TUBULAR", 50);
  input.items = [{
    id: "imported-m",
    fabricId: "fabric",
    size: "M",
    sleeveType: "CURTA",
    importedQuantity: 6,
    quantity: 12,
    sourceFichaId: "ficha-1",
  }];

  const result = calculateCutPlanAlternatives(input)[0].result.fabrics[0].sizes[0];
  assert.deepEqual(result, {
    garmentType: "T_SHIRT",
    size: "M",
    sleeveType: "CURTA",
    requested: 6,
    produced: 12,
    difference: 6,
  });
});

test("pedido Intercement permanece em dois enfestos com a dobra conservada pela area", () => {
  const input = createInput("TUBULAR", 50);
  input.items = [
    { id: "p", fabricId: "fabric", size: "P", sleeveType: "CURTA", quantity: 40 },
    { id: "m", fabricId: "fabric", size: "M", sleeveType: "CURTA", quantity: 60 },
    { id: "g", fabricId: "fabric", size: "G", sleeveType: "CURTA", quantity: 50 },
    { id: "gg", fabricId: "fabric", size: "GG", sleeveType: "CURTA", quantity: 30 },
  ];
  input.sizeProfiles = [
    measuredProfile("P", [73.8, 52.2, 76.4, 52.2, 25.6, 44.4, 63.7, 44.4]),
    measuredProfile("M", [75.8, 55.2, 78.4, 55.2, 26.7, 46.4, 67.8, 46.4]),
    measuredProfile("G", [77.8, 58.2, 80.4, 58.2, 27.7, 48.4, 68.8, 48.4]),
    measuredProfile("GG", [79.8, 62.2, 82.4, 62.2, 28.7, 50.4, 69.9, 50.4]),
  ];

  const result = calculateCutPlan(input).fabrics[0];
  assert.deepEqual(result.lays.map(({ layers }) => layers), [15, 10]);
  assert.deepEqual(result.lays.map((lay) => formatMarkerLabel(lay.frequencies, false)), [
    "4-M + 2-G + 2-GG",
    "4-P + 2-G",
  ]);
  assert.ok(result.lays.every((lay) => (lay.markerLengthCm ?? 0) <= input.tableLengthCm));
  assert.ok(result.sizes.every((size) => size.difference === 0));
});

test("mescla opt-in alinha cores compativeis no mesmo enfesto sem alterar a producao", () => {
  const profile = measuredProfile("M", [70, 50, 70, 50, 25, 40, 60, 40]);
  const fabrics = [
    { id: "black", name: "Malha Fria (PV)", color: "Preto", widthCm: 118, type: "TUBULAR" as const },
    { id: "white", name: "Malha Fria (PV)", color: "Branco", widthCm: 118, type: "TUBULAR" as const },
    { id: "blue", name: "Malha Fria (PV)", color: "Azul", widthCm: 118, type: "TUBULAR" as const },
  ];
  const input: CutPlanInput = {
    tableLengthCm: 800,
    maxLayers: 50,
    fabrics,
    items: fabrics.map((fabric) => ({ id: fabric.id, fabricId: fabric.id, size: "M", sleeveType: "CURTA", quantity: fabric.id === "black" ? 12 : 6 })),
    sizeProfiles: [profile],
  };

  const separated = calculateCutPlanAlternatives(input)[0];
  assert.equal(separated.layCount, 3);
  assert.equal(separated.result.mergedLays, undefined);

  const merged = calculateCutPlanAlternatives({ ...input, mergeFabricsInLays: true })[0];
  assert.equal(merged.layCount, 1);
  assert.equal(merged.result.mergedLays?.[0].layers, 3);
  assert.deepEqual(merged.result.mergedLays?.[0].allocations.map((allocation) => ({
    fabricId: allocation.fabricId,
    frequency: allocation.frequencies[0].frequency,
  })), [
    { fabricId: "black", frequency: 4 },
    { fabricId: "blue", frequency: 2 },
    { fabricId: "white", frequency: 2 },
  ]);
  assert.ok(merged.result.fabrics.flatMap((fabric) => fabric.sizes).every((size) => size.difference === 0));
});

test("mescla tamanhos diferentes, mas nunca tecidos com largura incompativel", () => {
  const input: CutPlanInput = {
    tableLengthCm: 800,
    maxLayers: 50,
    mergeFabricsInLays: true,
    fabrics: [
      { id: "black", name: "Malha", color: "Preto", widthCm: 118, type: "TUBULAR" },
      { id: "white", name: "Malha", color: "Branco", widthCm: 118, type: "TUBULAR" },
      { id: "narrow", name: "Malha", color: "Azul", widthCm: 90, type: "TUBULAR" },
    ],
    items: [
      { id: "black-m", fabricId: "black", size: "M", sleeveType: "CURTA", quantity: 6 },
      { id: "white-g", fabricId: "white", size: "G", sleeveType: "CURTA", quantity: 6 },
      { id: "narrow-p", fabricId: "narrow", size: "P", sleeveType: "CURTA", quantity: 6 },
    ],
    sizeProfiles: [
      measuredProfile("P", [66, 46, 66, 46, 22, 36, 56, 36]),
      measuredProfile("M", [70, 50, 70, 50, 25, 40, 60, 40]),
      measuredProfile("G", [74, 54, 74, 54, 27, 44, 64, 44]),
    ],
  };
  const result = calculateCutPlanAlternatives(input)[0].result;
  assert.equal(result.mergedLays?.length, 2);
  assert.deepEqual(new Set(result.mergedLays?.[0].allocations.map((allocation) => allocation.fabricId)), new Set(["black", "white"]));
  assert.equal(result.mergedLays?.[1].allocations[0].fabricId, "narrow");
});

test("mescla pequenas quantidades impares tubulares e conserva as sobras por cor", () => {
  const fabrics = [
    { id: "black", name: "Malha", color: "Preto", widthCm: 118, type: "TUBULAR" as const },
    { id: "white", name: "Malha", color: "Branco", widthCm: 118, type: "TUBULAR" as const },
    { id: "blue", name: "Malha", color: "Azul", widthCm: 118, type: "TUBULAR" as const },
  ];
  const quantities = [1, 3, 5];
  const input: CutPlanInput = {
    tableLengthCm: 800,
    maxLayers: 50,
    mergeFabricsInLays: true,
    fabrics,
    items: fabrics.map((fabric, index) => ({ id: fabric.id, fabricId: fabric.id, size: "M", sleeveType: "CURTA", quantity: quantities[index] })),
    sizeProfiles: [measuredProfile("M", [70, 50, 70, 50, 25, 40, 60, 40])],
  };
  const alternative = calculateCutPlanAlternatives(input)[0];
  const sizes = alternative.result.fabrics.flatMap((fabric) => fabric.sizes);

  assert.equal(alternative.layCount, 1);
  assert.equal(alternative.result.mergedLays?.[0].layers, 1);
  assert.deepEqual(Object.fromEntries(alternative.result.mergedLays?.[0].allocations.map((allocation) => [allocation.fabricId, allocation.frequencies[0].frequency]) ?? []), {
    black: 2,
    white: 4,
    blue: 6,
  });
  assert.deepEqual(sizes.map(({ requested, produced, difference }) => ({ requested, produced, difference })), [
    { requested: 1, produced: 2, difference: 1 },
    { requested: 5, produced: 6, difference: 1 },
    { requested: 3, produced: 4, difference: 1 },
  ]);
  assert.equal(sizes.reduce((total, size) => total + Math.max(0, size.difference), 0), 3);
});

test("mantem o mesmo tamanho separado por tipo de manga", () => {
  const input = createInput("PLANO", 20);
  input.items = [
    { id: "short", fabricId: "fabric", size: "M", sleeveType: "CURTA", quantity: 10 },
    { id: "long", fabricId: "fabric", size: "M", sleeveType: "LONGA", quantity: 12 },
  ];
  const result = calculateCutPlan(input).fabrics[0];
  assert.deepEqual(result.sizes.map(({ size, sleeveType, requested }) => ({ size, sleeveType, requested })), [
    { size: "M", sleeveType: "CURTA", requested: 10 },
    { size: "M", sleeveType: "LONGA", requested: 12 },
  ]);
  assert.ok(result.lays.flatMap((lay) => lay.frequencies).some((marker) => marker.size === "M" && marker.sleeveType === "CURTA"));
  assert.ok(result.lays.flatMap((lay) => lay.frequencies).some((marker) => marker.size === "M" && marker.sleeveType === "LONGA"));
  assert.ok(solveMinimumLays(new Map([
    [cutPlanDemandKey("M", "CURTA"), 10],
    [cutPlanDemandKey("M", "LONGA"), 12],
  ]), 20, "PLANO", 4, unconstrained)[0]);
});

test("mantém o mesmo tamanho e manga separados por modelagem", () => {
  const input = createInput("PLANO", 20);
  input.items = ["T_SHIRT", "DRESS_SHIRT"].map((garmentType, index) => ({
    id: `modeling-${index}`,
    fabricId: "fabric",
    garmentType: garmentType as "T_SHIRT" | "DRESS_SHIRT",
    size: "M",
    sleeveType: "CURTA" as const,
    quantity: 2,
  }));

  const result = calculateCutPlan(input).fabrics[0];
  assert.deepEqual(result.sizes.map(({ garmentType, requested, produced }) => ({ garmentType, requested, produced })), [
    { garmentType: "DRESS_SHIRT", requested: 2, produced: 2 },
    { garmentType: "T_SHIRT", requested: 2, produced: 2 },
  ]);
  assert.equal(result.lays.flatMap((lay) => lay.frequencies).length, 2);
});

test("coincide com busca exaustiva independente em entradas pequenas", () => {
  for (const type of ["PLANO", "TUBULAR"] satisfies FabricType[]) {
    const step = type === "TUBULAR" ? 2 : 1;
    for (let left = step; left <= 12; left += step) {
      for (let right = step; right <= 12; right += step) {
        const expected = bruteMinimumLayCount([left, right], 4, type, 4);
        const actual = solveMinimumLays(new Map([["P", left], ["M", right]]), 4, type, 4, unconstrained)[0]?.lays.length ?? null;
        assert.equal(actual, expected, `${type}: ${left}/${right}`);
      }
    }
  }
});

test("benchmark do pedido operacional permanece interativo", () => {
  const startedAt = performance.now();
  const solution = solveMinimumLays(new Map([["P", 40], ["M", 60], ["G", 50], ["GG", 30]]), 50, "TUBULAR", 4, unconstrained)[0];
  const elapsed = performance.now() - startedAt;
  assert.equal(solution?.lays.length, 2);
  assert.ok(elapsed < 2_000, `solver levou ${elapsed.toFixed(1)} ms`);
});

test("orcamento combinatorio cai no fallback sem perder producao exata", () => {
  const input = createInput("TUBULAR", 50);
  input.items = Array.from({ length: 16 }, (_, index) => ({
    id: `item-${index}`,
    fabricId: "fabric",
    size: `T${index}`,
    sleeveType: index % 2 ? "LONGA" : "CURTA",
    quantity: 20 + index * 2,
  }));
  const startedAt = performance.now();
  const result = calculateCutPlan(input);
  const elapsed = performance.now() - startedAt;
  assert.ok(elapsed < 2_500, `calculo completo levou ${elapsed.toFixed(1)} ms`);
  assert.ok(result.fabrics[0].sizes.every((size) => size.difference === 0));
  assert.ok(result.fabrics[0].lays.every((lay) => lay.layers <= 50 && lay.frequencies.every(({ frequency }) => frequency % 2 === 0)));
});

test("agrupa demandas compativeis quando mangas e quantidades sao mistas sob limites dimensionais", () => {
  const input = createInput("TUBULAR", 50);
  input.maxFrequency = 14;
  input.items = [
    ["P", "CURTA", 5], ["P", "LONGA", 5],
    ["M", "CURTA", 24], ["M", "LONGA", 13],
    ["G", "CURTA", 14], ["G", "LONGA", 10],
    ["GG", "CURTA", 19], ["GG", "LONGA", 12],
    ["EGG", "CURTA", 5], ["EGG", "LONGA", 2],
    ["EEGG (58)", "CURTA", 5], ["EEGG (58)", "LONGA", 5],
    ["EGG (56)", "CURTA", 1], ["XG (52)", "CURTA", 1],
  ].map(([size, sleeveType, quantity], index) => ({
    id: `mixed-${index}`,
    fabricId: "fabric",
    size: String(size),
    sleeveType: sleeveType as "CURTA" | "LONGA",
    quantity: Number(quantity),
  }));

  const result = calculateCutPlan(input).fabrics[0];

  assert.ok(result.lays.length <= 5);
  assert.ok(result.lays.some((lay) => lay.frequencies.length > 1));
  assert.ok(result.lays.some((lay) => new Set(lay.frequencies.map(({ sleeveType }) => sleeveType)).size === 2));
  assert.ok(result.sizes.every(({ requested, produced }) => produced === requested || produced === requested + 1));
});

function bruteMinimumLayCount(quantities: number[], maxLayers: number, type: FabricType, maxCount: number) {
  const options = type === "TUBULAR" ? [0, 2, 4, 6, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let count = 1; count <= maxCount; count += 1) {
    for (const layers of bruteLayerSets(maxLayers, count)) {
      const assignments = quantities.map((quantity) => assignmentVectors(quantity, layers, options));
      if (assignments.every((values) => values.length) && assignments[0].some((left) => assignments[1].some((right) =>
        left.every((frequency, index) => frequency + right[index] <= 8)))) return count;
    }
  }
  return null;
}

function assignmentVectors(quantity: number, layers: number[], options: number[], index = 0, frequencies: number[] = []): number[][] {
  if (index === layers.length) return quantity === 0 ? [frequencies] : [];
  return options.flatMap((frequency) => quantity - frequency * layers[index] >= 0
    ? assignmentVectors(quantity - frequency * layers[index], layers, options, index + 1, [...frequencies, frequency]) : []);
}

function *bruteLayerSets(maxLayers: number, count: number, ceiling = maxLayers, prefix: number[] = []): Generator<number[]> {
  if (!count) {
    yield prefix;
    return;
  }
  for (let layer = ceiling; layer >= 1; layer -= 1) yield *bruteLayerSets(maxLayers, count - 1, layer, [...prefix, layer]);
}

function canAssign(quantity: number, layers: number[], options: number[], index = 0) {
  if (index === layers.length) return quantity === 0;
  return options.some((frequency) => quantity - frequency * layers[index] >= 0 && canAssign(quantity - frequency * layers[index], layers, options, index + 1));
}

function createInput(type: FabricType, maxLayers: number): CutPlanInput {
  return {
    tableLengthCm: 800,
    maxLayers,
    fabrics: [{ id: "fabric", name: "Malha", color: "", widthCm: 118, type }],
    items: [{ id: "item", fabricId: "fabric", size: "M", sleeveType: "CURTA", quantity: type === "TUBULAR" ? 20 : 10 }],
    sizeProfiles: [],
  };
}

function measuredProfile(
  size: string,
  [frontHeightCm, frontWidthCm, backHeightCm, backWidthCm, shortSleeveHeightCm, shortSleeveWidthCm, longSleeveHeightCm, longSleeveWidthCm]: number[],
): CutPlanSizeProfile {
  return {
    id: size.toLowerCase(),
    size,
    aliases: [],
    frontHeightCm,
    frontWidthCm,
    backHeightCm,
    backWidthCm,
    shortSleeveHeightCm,
    shortSleeveWidthCm,
    longSleeveHeightCm,
    longSleeveWidthCm,
  };
}
