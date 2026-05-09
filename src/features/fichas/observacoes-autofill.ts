export type ObservacoesTecnicasInput = {
  acabamentoGola?: string;
  acabamentoManga?: string;
  arte?: string;
  arteLabel?: string;
  bolso?: string;
  comNomes?: string;
  corBotao?: string;
  corAcabamentoManga?: string;
  corAberturaLateral?: string;
  corDetalheGola?: string;
  corFaixa?: string;
  corFilete?: string;
  corGola?: string;
  corMaterial?: string;
  corPeDeGolaExterno?: string;
  corPeDeGolaInterno?: string;
  corPeitilhoExterno?: string;
  corPeitilhoInterno?: string;
  corReforco?: string;
  corSublimacao?: string;
  faixa?: string;
  faixaLocal?: string;
  filete?: string;
  fileteLocal?: string;
  gola?: string;
  larguraGola?: string;
  larguraManga?: string;
  manga?: string;
  material?: string;
  produto?: string;
  reforcoGola?: string;
};

const NO_VALUE = new Set(["", "0", "-", "nao", "não", "nenhum", "sem bolso"]);

export function buildObservacoesTecnicas(input: ObservacoesTecnicasInput) {
  const segments = [
    buildProdutoSegment(input),
    buildMaterialSegment(input),
    buildMangaSegment(input),
    buildGolaSegment(input),
    buildBotaoSegment(input),
    buildPeitilhoSegment(input),
    buildPeDeGolaSegment(input),
    buildAberturaLateralSegment(input),
    buildBolsoSegment(input),
    buildFileteSegment(input),
    buildFaixaSegment(input),
    buildPersonalizacaoSegment(input),
    buildComNomesSegment(input),
  ].filter(Boolean);

  return toUpperText(segments.join(" / "));
}

export function uppercaseObservationHtml(html: string) {
  if (!html.trim()) return "";
  return html.replace(/>([^<]+)</g, (_match, text: string) => `>${toUpperText(text)}<`);
}

function buildProdutoSegment(input: ObservacoesTecnicasInput) {
  const produto = normalizeProduto(input.produto);

  if (!produto) return "";
  return produto;
}

function buildMaterialSegment(input: ObservacoesTecnicasInput) {
  const material = normalizeMaterial(input.material);
  const corMaterial = clean(input.corMaterial);

  if (!material && !corMaterial) return "";

  if (isSublimacao(corMaterial)) {
    return material;
  }

  return joinWords([material, corMaterial]);
}

function buildMangaSegment(input: ObservacoesTecnicasInput) {
  const manga = clean(input.manga);
  const acabamento = clean(input.acabamentoManga);
  const largura = clean(input.larguraManga);
  const corAcabamento = clean(input.corAcabamentoManga);
  if (!manga && !acabamento) return "";

  if (!acabamento) return `MANGA ${manga}`;

  const usesDetailedAcabamento = shouldUseCom(acabamento);
  const connector = usesDetailedAcabamento ? "COM" : "EM";
  const acabamentoColor = normalizeAcabamentoColor(corAcabamento);
  return joinWords([
    "MANGA",
    manga,
    connector,
    normalizeAcabamentoManga(acabamento),
    usesDetailedAcabamento ? largura : "",
    usesDetailedAcabamento ? acabamentoColor : "",
  ]);
}

function buildGolaSegment(input: ObservacoesTecnicasInput) {
  const gola = normalizeGola(input.gola);
  const acabamento = clean(input.acabamentoGola);
  const largura = clean(input.larguraGola);
  const corGola = clean(input.corGola);
  const corDetalhe = clean(input.corDetalheGola);
  const reforco = clean(input.reforcoGola);
  const corReforco = clean(input.corReforco);
  if (isSocialGola(gola)) return "";
  if (isPoloGola(gola)) return buildGolaPoloSegment(gola, corGola);
  if (!gola && !acabamento && !corGola) return "";

  const cor = isSublimacao(corGola) ? "SUBLIMADA" : corGola;
  const base = joinWords([
    gola,
    acabamento ? `DE ${normalizeAcabamento(acabamento)}` : "",
    largura,
    cor,
  ]);
  const extras = [
    isPadreEsportivaGola(gola) && corDetalhe ? `DETALHE NA COR ${corDetalhe}` : "",
    reforco === "sim" ? joinWords(["REFORÇO", corReforco]) : "",
  ].filter(Boolean);

  return joinWords(["GOLA", base, joinExtraDetails(extras)]);
}

function buildGolaPoloSegment(gola: string, corGola: string) {
  const cor = isSublimacao(corGola) ? "SUBLIMADA" : corGola;
  return joinWords(["GOLA", gola, cor]);
}

function buildBotaoSegment(input: ObservacoesTecnicasInput) {
  const corBotao = clean(input.corBotao);
  if (!corBotao) return "";
  return `BOTÃO ${corBotao}`;
}

function buildPeitilhoSegment(input: ObservacoesTecnicasInput) {
  const interno = clean(input.corPeitilhoInterno);
  const externo = clean(input.corPeitilhoExterno);

  if (interno && externo && normalizeKey(interno) === normalizeKey(externo)) {
    return `PEITILHO INTERNO E EXTERNO ${interno}`;
  }

  if (interno && externo) {
    return `PEITILHO INTERNO ${interno} E EXTERNO ${externo}`;
  }

  if (interno) return `PEITILHO INTERNO ${interno}`;
  if (externo) return `PEITILHO EXTERNO ${externo}`;
  return "";
}

function buildPeDeGolaSegment(input: ObservacoesTecnicasInput) {
  const interno = clean(input.corPeDeGolaInterno);
  const externo = clean(input.corPeDeGolaExterno);

  if (interno && externo && normalizeKey(interno) === normalizeKey(externo)) {
    return `PÉ DE GOLA INTERNO E EXTERNO ${interno}`;
  }

  if (interno && externo) {
    return `PÉ DE GOLA INTERNO ${interno} E EXTERNO ${externo}`;
  }

  if (interno) return `PÉ DE GOLA INTERNO ${interno}`;
  if (externo) return `PÉ DE GOLA EXTERNO ${externo}`;
  return "";
}

function buildAberturaLateralSegment(input: ObservacoesTecnicasInput) {
  const corAbertura = clean(input.corAberturaLateral);
  if (!corAbertura) return "";
  return joinWords(["ABERTURA LATERAL", corAbertura]);
}

function buildBolsoSegment(input: ObservacoesTecnicasInput) {
  const bolso = clean(input.bolso);
  if (!bolso) return "";
  if (isSemBolso(bolso)) return "SEM BOLSO";
  if (isNone(bolso)) return "";
  return `COM ${normalizeBolso(bolso)}`;
}

function buildFileteSegment(input: ObservacoesTecnicasInput) {
  if (clean(input.filete) !== "sim") return "";
  const local = clean(input.fileteLocal);
  const cor = clean(input.corFilete);
  return joinWords(["FILETE", cor, local ? `NA ${local}` : ""]);
}

function buildFaixaSegment(input: ObservacoesTecnicasInput) {
  if (clean(input.faixa) !== "sim") return "";
  return joinWords(["FAIXA REFLETIVA", clean(input.faixaLocal), clean(input.corFaixa)]);
}

function buildPersonalizacaoSegment(input: ObservacoesTecnicasInput) {
  const arte = clean(input.arte);
  const arteLabel = clean(input.arteLabel) || arte;
  if (!arte || arte === "sem_personalizacao") return "SEM PERSONALIZAÇÃO";

  const corSublimacao = clean(input.corSublimacao);
  return joinWords(["PERSONALIZAÇÃO EM", arteLabel, corSublimacao ? `COR ${corSublimacao}` : ""]);
}

function buildComNomesSegment(input: ObservacoesTecnicasInput) {
  const value = clean(input.comNomes);
  if (value === "1") return "COM NOMES";
  if (value === "2") return "COM NOMES E NÚMEROS";
  if (value === "3") return "SOMENTE NÚMEROS";
  return "";
}

function clean(value?: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isNone(value: string) {
  return NO_VALUE.has(value.toLowerCase());
}

function isSemBolso(value: string) {
  return normalizeKey(value) === "sem bolso";
}

function isSublimacao(value: string) {
  const normalized = normalizeKey(value);
  return normalized === "sublimacao" || normalized === "sublimado" || normalized === "sublimada";
}

function normalizeKey(value: string) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeProduto(value?: string) {
  const normalized = normalizeKey(value ?? "");
  const raw = clean(value);
  if (!raw) return "";
  if (normalized.includes("camisete") && normalized.includes("social")) return "CAMISETE SOCIAL";
  if (normalized.includes("camisa") && normalized.includes("social")) return "CAMISA SOCIAL";
  if (normalized.includes("camiseta")) return "CAMISETA";
  if (normalized.includes("camisa")) return "CAMISA";
  if (normalized.includes("regata")) return "REGATA";
  if (normalized.includes("colete")) return "COLETE";
  if (normalized.includes("calca")) return "CALÇA";
  if (normalized.includes("jaleco")) return "JALECO";
  if (normalized.includes("bermuda")) return "BERMUDA";
  return raw;
}

function normalizeMaterial(value?: string) {
  const normalized = normalizeKey(value ?? "");
  if (!normalized) return "";
  if (normalized.includes("dry fit") || normalized.includes("dryfit")) return "MALHA DRY FIT";
  if (normalized.includes("malha fria") || normalized.includes("pv")) return "MALHA PV";
  if (normalized.includes("profit")) return "TECIDO PROFIT";
  if (normalized.includes("tricoline")) return "TECIDO TRICOLINE";
  if (normalized.includes("camisaria")) return "TECIDO DE CAMISARIA";
  if (normalized.includes("brim")) return "BRIM";
  if (normalized.includes("helanca")) return "HELANCA";
  return clean(value);
}

function normalizeAcabamento(value: string) {
  const normalized = normalizeKey(value);
  if (normalized.includes("ribana")) return "RIBANA";
  if (normalized.includes("punho")) return "PUNHO";
  if (normalized.includes("vies")) return "VIÉS";
  if (normalized.includes("barra")) return "BARRA";
  return value;
}

function normalizeAcabamentoManga(value: string) {
  const normalized = normalizeKey(value);
  if (normalized.includes("punho") && normalized.includes("sublim")) return "PUNHO SUBLIMADO";
  if (normalized.includes("punho") && normalized.includes("ribana")) return "PUNHO DE RIBANA";
  if (normalized.includes("punho")) return "PUNHO";
  if (normalized.includes("vies") && normalized.includes("sublim")) return "VIÉS SUBLIMADO";
  if (normalized.includes("vies")) return "VIÉS";
  if (normalized.includes("barra")) return "BARRA";
  return value;
}

function normalizeAcabamentoColor(value: string) {
  const cleanValue = clean(value);
  if (isSublimacao(cleanValue)) return "SUBLIMADO";
  return cleanValue;
}

function normalizeGola(value?: string) {
  return clean(value).replace(/^gola\s+/i, "");
}

function normalizeBolso(value: string) {
  const normalized = normalizeKey(value);
  if (normalized.includes("peito")) return "BOLSO NO PEITO";
  return value;
}

function isSocialGola(value: string) {
  return normalizeKey(value).includes("social");
}

function isPoloGola(value: string) {
  return normalizeKey(value).includes("polo");
}

function isPadreEsportivaGola(value: string) {
  const normalized = normalizeKey(value);
  return normalized.includes("padre") && normalized.includes("esportiva");
}

function shouldUseCom(value: string) {
  const normalized = normalizeKey(value);
  return normalized.includes("punho") || normalized.includes("vies");
}

function joinExtraDetails(extras: string[]) {
  if (!extras.length) return "";
  return `COM ${extras.join(" E COM ")}`;
}

function joinWords(parts: string[]) {
  return parts.map(clean).filter(Boolean).join(" ");
}

function toUpperText(value: string) {
  return value.toLocaleUpperCase("pt-BR");
}
