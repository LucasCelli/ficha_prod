export type NormalizeNameOrCompanyOptions = {
  mode?: "auto" | "person" | "company";
};

const CONNECTORS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "d"]);

const BUSINESS_SUFFIXES = new Set(["ME", "MEI", "EPP", "EI", "EIRELI", "LTDA", "SA", "S/A", "S.A", "S.A.", "SLU", "SS", "S/S", "CIA"]);

const KNOWN_ACRONYMS = new Set([
  "MJ",
  "NSA",
  "ABC",
  "BR",
  "MS",
  "SP",
  "RJ",
  "TI",
  "RH",
  "IA",
  "AI",
  "UX",
  "UI",
  "API",
  "SESI",
  "FIEMS",
  "GOV",
  "SENAI",
]);

const BUSINESS_KEYWORDS = new Set([
  "mercado",
  "supermercado",
  "minimercado",
  "padaria",
  "confeitaria",
  "restaurante",
  "lanchonete",
  "bar",
  "loja",
  "comercio",
  "comércio",
  "servicos",
  "serviços",
  "consultoria",
  "tecnologia",
  "sistemas",
  "agronegocios",
  "agronegócios",
  "agro",
  "transportes",
  "construtora",
  "engenharia",
  "industria",
  "indústria",
  "distribuidora",
  "importadora",
  "exportadora",
  "confecções",
  "confeccoes",
  "malharia",
  "modas",
  "autopecas",
  "autopeças",
  "mecanica",
  "mecânica",
]);

function stripDots(value: string) {
  return value.replace(/\./g, "");
}

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isAllUpperText(value: string) {
  const letters = value.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length > 0 && letters === letters.toLocaleUpperCase("pt-BR");
}

function isBusinessSuffix(word: string) {
  const upper = word.toLocaleUpperCase("pt-BR");
  const clean = stripDots(upper);
  return BUSINESS_SUFFIXES.has(upper) || BUSINESS_SUFFIXES.has(clean);
}

function hasBusinessSignal(words: string[]) {
  return words.some((word) => {
    const lower = word.toLocaleLowerCase("pt-BR");
    const upper = word.toLocaleUpperCase("pt-BR");
    return BUSINESS_KEYWORDS.has(lower) || isBusinessSuffix(upper);
  });
}

function looksLikeAcronym(rawWord: string, context: { fullInputWasUpper: boolean; isCompany: boolean }) {
  const clean = stripDots(rawWord.replace(/[^\p{L}\p{N}/]/gu, ""));
  const upper = clean.toLocaleUpperCase("pt-BR");

  if (!clean) return false;

  const isShort = upper.length >= 2 && upper.length <= 5;
  const originalWasUpper = clean === upper;
  const isKnown = KNOWN_ACRONYMS.has(upper);
  const isUnknownShortAcronym = upper.length <= 3;

  if (!isShort) return false;
  if (isKnown) return true;
  if (isUnknownShortAcronym && !context.fullInputWasUpper && originalWasUpper) return true;
  if (isUnknownShortAcronym && context.isCompany && originalWasUpper) return true;

  return false;
}

function isAmpersandAcronym(rawWord: string) {
  return /^[\p{L}\p{N}]{1,5}(?:&[\p{L}\p{N}]{1,5})+$/u.test(rawWord);
}

function capitalizeSimpleWord(word: string) {
  if (!word) return word;

  const lower = word.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

function capitalizeCompoundWord(word: string) {
  return word
    .split("-")
    .map((part) => {
      if (part.includes("'")) return capitalizeApostropheWord(part, "'");
      if (part.includes("’")) return capitalizeApostropheWord(part, "’");
      return capitalizeSimpleWord(part);
    })
    .join("-");
}

function capitalizeApostropheWord(word: string, separator: "'" | "’") {
  if (!word.includes(separator)) return capitalizeSimpleWord(word);

  return word
    .split(separator)
    .map((piece, index) => {
      if (index === 0 && piece.length === 1) {
        return piece.toLocaleUpperCase("pt-BR");
      }

      return capitalizeSimpleWord(piece);
    })
    .join(separator);
}

export function normalizeNameOrCompany(input: unknown, options: NormalizeNameOrCompanyOptions = {}) {
  if (!input || typeof input !== "string") return "";

  const mode = options.mode ?? "auto";
  const text = normalizeSpaces(input);
  const words = text.split(" ");
  const fullInputWasUpper = isAllUpperText(text);
  const isCompany = mode === "company" || (mode === "auto" && hasBusinessSignal(words));

  return words
    .map((rawWord, index) => {
      const word = rawWord.trim();
      const lower = word.toLocaleLowerCase("pt-BR");
      const upper = word.toLocaleUpperCase("pt-BR");
      const cleanUpper = stripDots(upper);
      const isFirst = index === 0;
      const isLast = index === words.length - 1;

      if (word === "&") return "&";

      if (isAmpersandAcronym(word)) {
        return word.toLocaleUpperCase("pt-BR");
      }

      if (isLast && isBusinessSuffix(word)) {
        if (cleanUpper === "SA") return "S/A";
        return cleanUpper;
      }

      if (looksLikeAcronym(word, { fullInputWasUpper, isCompany })) {
        return cleanUpper;
      }

      if (CONNECTORS.has(lower) && !isFirst && !isLast) {
        return lower;
      }

      return capitalizeCompoundWord(word);
    })
    .join(" ");
}
