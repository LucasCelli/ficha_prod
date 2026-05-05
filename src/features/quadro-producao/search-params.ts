import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";

export const quadroProducaoSearchParamParsers = {
  arte: parseAsString.withDefault(""),
  busca: parseAsString.withDefault(""),
  insumo: parseAsString.withDefault(""),
  semana: parseAsBoolean.withDefault(false),
  tecido: parseAsString.withDefault(""),
};

export const loadQuadroProducaoSearchParams = createLoader(quadroProducaoSearchParamParsers);
