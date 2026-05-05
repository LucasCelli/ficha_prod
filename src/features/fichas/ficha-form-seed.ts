import type { FichaDetail } from "./data";

export type ProductFormItem = {
  detalhesProduto: string;
  id: string;
  produto: string;
  quantidade: string;
  tamanho: string;
};

export type ImageFormItem = {
  altText: string;
  bytes?: number;
  file?: File;
  height?: number;
  id: string;
  importMode?: "legacy-preview-only" | "legacy-saveable";
  importWarning?: string;
  persisted?: boolean;
  previewUrl?: string;
  publicId?: string;
  saveBlocked?: boolean;
  secureUrl?: string;
  width?: number;
};

export type FichaFormClientValues = {
  acabamentoGola: string;
  acabamentoManga: string;
  aberturaLateral: string;
  arte: string;
  comNomes: string;
  composicao: string;
  faixa: string;
  filete: string;
  gola: string;
  imagens: ImageFormItem[];
  itens: ProductFormItem[];
  material: string;
  observacoes: string;
  reforcoGola: string;
  viesRegata: string;
};

export type FichaFormInitialData = {
  acabamentoGola: string;
  acabamentoManga: string;
  aberturaLateral: string;
  arte: string;
  bolso: string;
  cliente: string;
  clienteAuxiliar: string;
  comNomes: string;
  composicao: string;
  corAberturaLateral: string;
  corAcabamentoManga: string;
  corBotao: string;
  corGola: string;
  corMaterial: string;
  corPeDeGolaExterno: string;
  corPeDeGolaInterno: string;
  corPeitilhoExterno: string;
  corPeitilhoInterno: string;
  corReforco: string;
  corSublimacao: string;
  dataEntrega: string;
  dataInicio: string;
  evento: boolean;
  faixa: string;
  faixaCor: string;
  faixaLocal: string;
  filete: string;
  fileteCor: string;
  fileteLocal: string;
  gola: string;
  imagens: ImageFormItem[];
  itens: ProductFormItem[];
  larguraGola: string;
  larguraManga: string;
  manga: string;
  material: string;
  numeroVenda: string;
  observacoes: string;
  reforcoGola: string;
  vendedor: string;
};

export function createEmptyProductItem(id = "item-0"): ProductFormItem {
  return {
    detalhesProduto: "",
    id,
    produto: "",
    quantidade: "1",
    tamanho: "",
  };
}

export function createEmptyFichaFormInitialData(): FichaFormInitialData {
  return {
    acabamentoGola: "",
    acabamentoManga: "",
    aberturaLateral: "nao",
    arte: "",
    bolso: "",
    cliente: "",
    clienteAuxiliar: "",
    comNomes: "",
    composicao: "",
    corAberturaLateral: "",
    corAcabamentoManga: "",
    corBotao: "",
    corGola: "",
    corMaterial: "",
    corPeDeGolaExterno: "",
    corPeDeGolaInterno: "",
    corPeitilhoExterno: "",
    corPeitilhoInterno: "",
    corReforco: "",
    corSublimacao: "",
    dataEntrega: "",
    dataInicio: "",
    evento: false,
    faixa: "nao",
    faixaCor: "",
    faixaLocal: "",
    filete: "nao",
    fileteCor: "",
    fileteLocal: "",
    gola: "",
    imagens: [],
    itens: [createEmptyProductItem()],
    larguraGola: "",
    larguraManga: "",
    manga: "",
    material: "",
    numeroVenda: "",
    observacoes: "",
    reforcoGola: "nao",
    vendedor: "",
  };
}

export function mapFichaToInitialData(ficha?: FichaDetail): FichaFormInitialData {
  const initial = createEmptyFichaFormInitialData();
  if (!ficha) return initial;

  return {
    ...initial,
    acabamentoGola: ficha.acabamento_gola ?? "",
    acabamentoManga: ficha.acabamento_manga ?? "",
    aberturaLateral: ficha.abertura_lateral ?? "nao",
    arte: ficha.arte ?? "",
    bolso: ficha.bolso ?? "",
    cliente: ficha.cliente_nome_snapshot ?? "",
    clienteAuxiliar: ficha.cliente_auxiliar ?? "",
    comNomes: ficha.com_nomes?.toString() ?? "",
    composicao: ficha.composicao ?? "",
    corAberturaLateral: ficha.cor_abertura_lateral ?? "",
    corAcabamentoManga: ficha.cor_acabamento_manga ?? "",
    corBotao: ficha.cor_botao ?? "",
    corGola: ficha.cor_gola ?? "",
    corMaterial: ficha.cor_material ?? "",
    corPeDeGolaExterno: ficha.cor_pe_de_gola_externo ?? "",
    corPeDeGolaInterno: ficha.cor_pe_de_gola_interno ?? "",
    corPeitilhoExterno: ficha.cor_peitilho_externo ?? "",
    corPeitilhoInterno: ficha.cor_peitilho_interno ?? "",
    corReforco: ficha.cor_reforco ?? "",
    corSublimacao: ficha.cor_sublimacao ?? "",
    dataEntrega: ficha.data_entrega ?? "",
    dataInicio: ficha.data_inicio ?? "",
    evento: Boolean(ficha.evento),
    faixa: ficha.faixa ?? "nao",
    faixaCor: ficha.faixa_cor ?? "",
    faixaLocal: ficha.faixa_local ?? "",
    filete: ficha.filete ?? "nao",
    fileteCor: ficha.filete_cor ?? "",
    fileteLocal: ficha.filete_local ?? "",
    gola: ficha.gola ?? "",
    imagens: (ficha.imagens ?? []).map((image) => {
      const dados = image.dados && typeof image.dados === "object" && !Array.isArray(image.dados) ? image.dados : {};
      const publicId = "publicId" in dados && typeof dados.publicId === "string" ? dados.publicId : image.storage_path ?? image.id;

      return {
        altText: image.alt_text ?? "",
        bytes: image.bytes ?? undefined,
        height: image.height ?? undefined,
        id: image.id,
        persisted: true,
        publicId,
        secureUrl: image.url,
        width: image.width ?? undefined,
      };
    }),
    itens: ficha.itens?.length
      ? ficha.itens.map((item) => ({
        detalhesProduto: item.detalhes_produto ?? item.detalhes ?? "",
        id: item.id,
        produto: item.produto ?? item.descricao ?? "",
        quantidade: String(item.quantidade ?? 1),
        tamanho: item.tamanho ?? "",
      }))
      : [createEmptyProductItem()],
    larguraGola: ficha.largura_gola ?? "",
    larguraManga: ficha.largura_manga ?? "",
    manga: ficha.manga ?? "",
    material: ficha.material ?? "",
    numeroVenda: ficha.numero_venda ?? "",
    observacoes: ficha.observacoes ?? "",
    reforcoGola: ficha.reforco_gola ?? "nao",
    vendedor: ficha.vendedor ?? "",
  };
}
