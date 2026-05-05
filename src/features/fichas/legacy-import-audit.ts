export type LegacyParityStatus = "1:1 confirmado" | "ainda pendente" | "coberto com adaptação";

export type LegacyParityAuditEntry = {
  field: string;
  notes?: string;
  status: LegacyParityStatus;
};

export type LegacyParityAuditSection = {
  entries: LegacyParityAuditEntry[];
  section: string;
};

export const LEGACY_FICHA_PARITY_AUDIT: LegacyParityAuditSection[] = [
  {
    section: "Campos de cabeçalho e comerciais",
    entries: [
      { field: "cliente", status: "1:1 confirmado" },
      { field: "clienteAuxiliar", status: "1:1 confirmado" },
      { field: "vendedor", status: "1:1 confirmado" },
      { field: "numeroVenda", status: "1:1 confirmado" },
      { field: "dataInicio", status: "1:1 confirmado" },
      { field: "dataEntrega", status: "1:1 confirmado" },
      { field: "evento", status: "1:1 confirmado" },
    ],
  },
  {
    section: "Campos técnicos",
    entries: [
      { field: "material", status: "1:1 confirmado" },
      { field: "composicao", status: "1:1 confirmado" },
      { field: "corMaterial", status: "1:1 confirmado" },
      { field: "manga", status: "1:1 confirmado" },
      { field: "larguraManga", status: "1:1 confirmado" },
      { field: "acabamentoManga", status: "1:1 confirmado" },
      { field: "corAcabamentoManga", status: "1:1 confirmado" },
      { field: "gola", status: "1:1 confirmado" },
      { field: "larguraGola", status: "1:1 confirmado" },
      { field: "acabamentoGola", status: "1:1 confirmado" },
      { field: "corGola", status: "1:1 confirmado" },
      { field: "corPeitilhoInterno", status: "1:1 confirmado" },
      { field: "corPeitilhoExterno", status: "1:1 confirmado" },
      { field: "corPeDeGolaInterno", status: "1:1 confirmado" },
      { field: "corPeDeGolaExterno", status: "1:1 confirmado" },
      { field: "corBotao", status: "1:1 confirmado" },
      { field: "reforcoGola", status: "1:1 confirmado" },
      { field: "corReforco", status: "1:1 confirmado" },
      { field: "aberturaLateral", status: "1:1 confirmado" },
      { field: "corAberturaLateral", status: "1:1 confirmado" },
      { field: "bolso", status: "1:1 confirmado" },
      { field: "filete", status: "1:1 confirmado" },
      { field: "fileteLocal", status: "1:1 confirmado" },
      { field: "fileteCor", status: "1:1 confirmado" },
      { field: "faixa", status: "1:1 confirmado" },
      { field: "faixaLocal", status: "1:1 confirmado" },
      { field: "faixaCor", status: "1:1 confirmado" },
      { field: "arte", status: "1:1 confirmado" },
      { field: "corSublimacao", status: "1:1 confirmado" },
      { field: "comNomes", status: "1:1 confirmado" },
      { field: "observacoes", status: "1:1 confirmado" },
      { field: "itens", status: "1:1 confirmado" },
      { field: "imagens", notes: "Conversão integral quando a origem já respeita URL remota e publicId.", status: "coberto com adaptação" },
    ],
  },
  {
    section: "Regras dinâmicas",
    entries: [
      { field: "regata/colete altera manga e viés", status: "1:1 confirmado" },
      { field: "gola automática para social/polo", status: "1:1 confirmado" },
      { field: "material e composição automáticos por produto compatível", status: "1:1 confirmado" },
      { field: "corSublimacao condicional", status: "1:1 confirmado" },
      { field: "campos extras condicionais de gola, manga, filete, faixa, abertura e reforço", status: "1:1 confirmado" },
      { field: "auto-preenchimento de observações", notes: "Ainda falta validar linha a linha contra exemplos reais do legado.", status: "ainda pendente" },
      { field: "ordenação automática de produtos", status: "1:1 confirmado" },
      { field: "drag and drop e limite de imagens", status: "1:1 confirmado" },
      { field: "impressão de rascunho sem salvar", status: "1:1 confirmado" },
    ],
  },
];
