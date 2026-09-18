import { isUniformBabyLookText, normalizeUniformSizeKey } from "../../lib/uniform-sizes.ts";
import type { CutPlanSizeProfile, SleeveType } from "./model.ts";

export type MeasurementSource = "REGISTERED" | "FALLBACK_HIGH" | "FALLBACK_MEDIUM" | "FALLBACK_LOW" | "UNKNOWN";

type ShirtFallback = {
  bodyHeightCm: number;
  bodyWidthCm: number;
  confidence: Exclude<MeasurementSource, "REGISTERED" | "UNKNOWN">;
  longSleeveHeightCm: number;
  shortSleeveHeightCm: number;
};
type LowerFallback = { heightCm: number; circumferenceCm: number; confidence: "FALLBACK_HIGH" | "FALLBACK_MEDIUM" | "FALLBACK_LOW" };

// Base versionada a partir de Tabelas_de_Medidas_Fallback_Solver.docx (2026-09-11).
const TRADITIONAL: Record<string, ShirtFallback> = {
  PP: { bodyHeightCm: 67, bodyWidthCm: 50, shortSleeveHeightCm: 23, longSleeveHeightCm: 60, confidence: "FALLBACK_LOW" },
  P: { bodyHeightCm: 69, bodyWidthCm: 52, shortSleeveHeightCm: 24, longSleeveHeightCm: 61, confidence: "FALLBACK_MEDIUM" },
  M: { bodyHeightCm: 72, bodyWidthCm: 55, shortSleeveHeightCm: 25, longSleeveHeightCm: 63, confidence: "FALLBACK_MEDIUM" },
  G: { bodyHeightCm: 75, bodyWidthCm: 58, shortSleeveHeightCm: 26, longSleeveHeightCm: 65, confidence: "FALLBACK_MEDIUM" },
  GG: { bodyHeightCm: 78, bodyWidthCm: 61, shortSleeveHeightCm: 27, longSleeveHeightCm: 67, confidence: "FALLBACK_MEDIUM" },
  XG: { bodyHeightCm: 81, bodyWidthCm: 64, shortSleeveHeightCm: 28, longSleeveHeightCm: 69, confidence: "FALLBACK_MEDIUM" },
  EG: { bodyHeightCm: 84, bodyWidthCm: 67, shortSleeveHeightCm: 29, longSleeveHeightCm: 71, confidence: "FALLBACK_LOW" },
  EGG: { bodyHeightCm: 87, bodyWidthCm: 70, shortSleeveHeightCm: 30, longSleeveHeightCm: 73, confidence: "FALLBACK_LOW" },
};

const BABY_LOOK: Record<string, ShirtFallback> = {
  PP: { bodyHeightCm: 60, bodyWidthCm: 47, shortSleeveHeightCm: 14.5, longSleeveHeightCm: 59, confidence: "FALLBACK_HIGH" },
  P: { bodyHeightCm: 62, bodyWidthCm: 49.5, shortSleeveHeightCm: 15.5, longSleeveHeightCm: 61, confidence: "FALLBACK_HIGH" },
  M: { bodyHeightCm: 64, bodyWidthCm: 52, shortSleeveHeightCm: 16, longSleeveHeightCm: 62.5, confidence: "FALLBACK_HIGH" },
  G: { bodyHeightCm: 66, bodyWidthCm: 54.5, shortSleeveHeightCm: 17, longSleeveHeightCm: 64.5, confidence: "FALLBACK_HIGH" },
  GG: { bodyHeightCm: 68, bodyWidthCm: 57, shortSleeveHeightCm: 18, longSleeveHeightCm: 66, confidence: "FALLBACK_HIGH" },
  XG: { bodyHeightCm: 71, bodyWidthCm: 59.5, shortSleeveHeightCm: 19, longSleeveHeightCm: 68, confidence: "FALLBACK_LOW" },
};

const PANTS_NUMERIC: Record<string, LowerFallback> = Object.fromEntries(
  [36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56].map((size, index) => [String(size), { heightCm: 104 + index, circumferenceCm: 96 + index * 4, confidence: "FALLBACK_HIGH" as const }]),
);
const PANTS_LETTER: Record<string, LowerFallback> = Object.fromEntries(
  ["PP", "P", "M", "G", "GG", "XG", "EG", "EGG", "EEGG"].map((size, index) => [size, {
    heightCm: [104, 105, 106, 107, 109, 110, 111, 112, 113][index], circumferenceCm: [100, 106, 112, 119, 128, 136, 144, 152, 160][index],
    confidence: index < 5 ? "FALLBACK_MEDIUM" as const : "FALLBACK_LOW" as const,
  }]),
);
const SHORTS_NUMERIC: Record<string, LowerFallback> = Object.fromEntries(
  [36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58].map((size, index) => [String(size), {
    heightCm: [59, 59, 60, 60, 61, 61, 62, 63, 64, 65, 66, 67][index], circumferenceCm: [100, 100, 108, 108, 112, 112, 116, 120, 124, 128, 132, 136][index],
    confidence: index < 6 ? "FALLBACK_HIGH" as const : "FALLBACK_LOW" as const,
  }]),
);
const SHORTS_LETTER: Record<string, LowerFallback> = Object.fromEntries(
  ["PP", "P", "M", "G", "GG", "XG"].map((size, index) => [size, {
    heightCm: [33, 34, 36, 39, 41, 43][index], circumferenceCm: [136, 140, 144, 152, 160, 168][index],
    confidence: index > 0 && index < 5 ? "FALLBACK_HIGH" as const : "FALLBACK_LOW" as const,
  }]),
);

function fallbackProfile(size: string, values: ShirtFallback): CutPlanSizeProfile {
  // A largura de manga é uma aproximação conservadora da cabeça/bíceps. A
  // fórmula de área mantém frente, costas e cada manga como componentes.
  const sleeveWidthCm = values.bodyWidthCm * 0.45;
  return {
    id: `fallback:${size}`,
    size,
    aliases: [],
    frontHeightCm: values.bodyHeightCm,
    frontWidthCm: values.bodyWidthCm,
    backHeightCm: values.bodyHeightCm,
    backWidthCm: values.bodyWidthCm,
    shortSleeveHeightCm: values.shortSleeveHeightCm,
    shortSleeveWidthCm: sleeveWidthCm,
    longSleeveHeightCm: values.longSleeveHeightCm,
    longSleeveWidthCm: sleeveWidthCm,
  };
}

export function resolveShirtFallback(size: string, sleeveType: SleeveType, conservativeUnknown = false) {
  const key = normalizeUniformSizeKey(size);
  const table = isUniformBabyLookText(size) ? BABY_LOOK : TRADITIONAL;
  // Sem medida feminina documentada, usa a base tradicional conservadora
  // e identifica a estimativa como de baixa confianca.
  const values = table[key] ?? (table === BABY_LOOK && TRADITIONAL[key]
    ? { ...TRADITIONAL[key], confidence: "FALLBACK_LOW" as const }
    : conservativeUnknown ? { ...TRADITIONAL.EGG, confidence: "FALLBACK_LOW" as const } : undefined);
  if (!values) return null;
  const profile = fallbackProfile(size, values);
  // +2 cm por unidade de frequência é a margem indicada para tabelas com boa
  // evidência; extrapolações recebem 3%, limitados a 5 cm.
  const margin = values.confidence === "FALLBACK_LOW"
    ? { kind: "factor" as const, value: 1.03, maximumCm: 5 }
    : { kind: "fixed" as const, value: 2 };
  return { confidence: values.confidence, margin, profile, sleeveType };
}

export function resolveLowerGarmentFallback(size: string, garment: "PANTS" | "SHORTS") {
  const remainder = size.replace(/^(?:CAL[CÇ]A|SHORT|BERMUDA)\s+/i, "");
  const key = normalizeUniformSizeKey(remainder);
  const table = garment === "PANTS"
    ? (/^\d+$/.test(key) ? PANTS_NUMERIC : PANTS_LETTER)
    : (/^\d+$/.test(key) ? SHORTS_NUMERIC : SHORTS_LETTER);
  return table[key] ?? null;
}
