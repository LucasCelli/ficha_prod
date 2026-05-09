export type FieldErrors = Partial<
  Record<
    | "acabamentoGola"
    | "acabamentoManga"
    | "aberturaLateral"
    | "arte"
    | "bolso"
    | "comNomes"
    | "cliente"
    | "clienteAuxiliar"
    | "composicao"
    | "corAberturaLateral"
    | "corAcabamentoManga"
    | "corBotao"
    | "corDetalheGola"
    | "corGola"
    | "corMaterial"
    | "corPeDeGolaExterno"
    | "corPeDeGolaInterno"
    | "corPeitilhoExterno"
    | "corPeitilhoInterno"
    | "corReforco"
    | "corSublimacao"
    | "dataEntrega"
    | "dataInicio"
    | "evento"
    | "faixa"
    | "faixaCor"
    | "faixaLocal"
    | "filete"
    | "fileteCor"
    | "fileteLocal"
    | "gola"
    | "imagensJson"
    | "itensJson"
    | "larguraGola"
    | "larguraManga"
    | "manga"
    | "material"
    | "numeroVenda"
    | "observacoes"
    | "reforcoGola"
    | "vendedor",
    string
  >
>;

export type FichaFormState = {
  fieldErrors?: FieldErrors;
  message?: string;
  status: "idle" | "error";
};

export type FichaStatusActionState = {
  message?: string;
  status: "idle" | "error";
};

export type FichaDeleteActionState = {
  message?: string;
  status: "idle" | "error";
};

export function getInitialFichaFormState(): FichaFormState {
  return {
    status: "idle",
  };
}

export function getInitialFichaStatusActionState(): FichaStatusActionState {
  return {
    status: "idle",
  };
}

export function getInitialFichaDeleteActionState(): FichaDeleteActionState {
  return {
    status: "idle",
  };
}
