export type NameCaseMode = "capitalized" | "lowercase" | "original" | "uppercase";

export function transformNameCase(value: string | null | undefined, mode: NameCaseMode) {
  if (!value) return value ?? null;
  if (mode === "original") return value;

  if (mode === "uppercase") return value.toLocaleUpperCase("pt-BR");
  if (mode === "lowercase") return value.toLocaleLowerCase("pt-BR");

  return value
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s'.-])(\p{L})/gu, (_match, separator: string, letter: string) => {
      return `${separator}${letter.toLocaleUpperCase("pt-BR")}`;
    });
}
