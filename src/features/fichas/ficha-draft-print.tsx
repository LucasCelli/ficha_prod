"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { normalizeNameOrCompany } from "@/lib/name-normalizer";
import { sanitizeObservationHtmlInBrowser } from "@/lib/sanitize-observations.client";
import type { FichaDetail } from "./data";
import type { FichaFormClientValues } from "./ficha-form-seed";
import { PrintFicha } from "./print-ficha";

export function DraftPrintLayer({
  ficha,
  includeRawNameList,
  onPrinted,
}: {
  ficha: FichaDetail;
  includeRawNameList: boolean;
  onPrinted: () => void;
}) {
  useEffect(() => {
    function handleAfterPrint() {
      onPrinted();
    }

    window.addEventListener("afterprint", handleAfterPrint);
    const printTimer = window.setTimeout(() => window.print(), 120);
    const cleanupTimer = window.setTimeout(onPrinted, 3000);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      window.clearTimeout(printTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [onPrinted]);

  return createPortal(
    <div className="draft-print-root" aria-hidden="true">
      <PrintFicha
        ficha={ficha}
        includeRawNameList={includeRawNameList}
        observationHtml={ficha.observacoes || ficha.observacoes_html || "Nenhuma"}
      />
    </div>,
    document.body,
  );
}

export function buildDraftPrintFicha(form: HTMLFormElement, values: FichaFormClientValues): FichaDetail {
  const formData = new FormData(form);
  const fichaId = "rascunho";
  const text = (field: string) => String(formData.get(field) ?? "").trim();

  return {
    id: fichaId,
    acabamento_gola: values.acabamentoGola || null,
    acabamento_manga: values.acabamentoManga || null,
    abertura_lateral: values.aberturaLateral || null,
    arte: values.arte || null,
    bolso: text("bolso") || null,
    cliente_auxiliar: text("clienteAuxiliar") || null,
    cliente_id: null,
    cliente_nome_snapshot: normalizeNameOrCompany(text("cliente")) || "Ficha sem cliente",
    com_nomes: values.comNomes ? Number(values.comNomes) : null,
    composicao: values.composicao || null,
    etiqueta: text("etiqueta") || null,
    cor_abertura_lateral: text("corAberturaLateral") || null,
    cor_acabamento_manga: text("corAcabamentoManga") || null,
    cor_botao: text("corBotao") || null,
    cor_detalhe_gola: text("corDetalheGola") || null,
    cor_gola: text("corGola") || null,
    cor_material: text("corMaterial") || null,
    cor_pe_de_gola_externo: text("corPeDeGolaExterno") || null,
    cor_pe_de_gola_interno: text("corPeDeGolaInterno") || null,
    cor_peitilho_externo: text("corPeitilhoExterno") || null,
    cor_peitilho_interno: text("corPeitilhoInterno") || null,
    cor_reforco: text("corReforco") || null,
    cor_sublimacao: text("corSublimacao") || null,
    created_at: new Date().toISOString(),
    data_entrega: text("dataEntrega") || null,
    data_inicio: text("dataInicio") || null,
    delivered_at: null,
    evento: Boolean(formData.get("evento")),
    faixa: values.faixa || null,
    faixa_cor: text("faixaCor") || null,
    faixa_local: text("faixaLocal") || null,
    filete: values.filete || null,
    filete_cor: text("fileteCor") || null,
    filete_local: text("fileteLocal") || null,
    gola: values.gola || null,
    imagens: values.imagens
      .map((image, index) => ({
        id: image.id || `draft-image-${index}`,
        alt_text: image.altText || null,
        bytes: image.bytes ?? null,
        created_at: new Date().toISOString(),
        dados: image.publicId ? { publicId: image.publicId } : null,
        ficha_id: fichaId,
        height: image.height ?? null,
        ordem: index,
        storage_path: image.publicId ?? null,
        url: image.previewUrl ?? image.secureUrl ?? "",
        width: image.width ?? null,
      }))
      .filter((image) => image.url),
    insumo_status: "tudo_ok",
    itens: values.itens
      .map((item, index) => ({
        id: item.id || `draft-item-${index}`,
        created_at: new Date().toISOString(),
        descricao: item.produto || null,
        detalhes: item.detalhesProduto || null,
        detalhes_produto: item.detalhesProduto || null,
        ficha_id: fichaId,
        ordem: index,
        produto: item.produto || null,
        quantidade: Number.parseInt(item.quantidade, 10) || 0,
        tamanho: item.tamanho ? item.tamanho.toUpperCase() : null,
      }))
      .filter((item) => item.produto || item.tamanho || item.quantidade || item.detalhes_produto),
    kanban_status: "pendente",
    largura_gola: text("larguraGola") || null,
    largura_manga: text("larguraManga") || null,
    legacy_ficha_id: null,
    lista_ia: null,
    lista_ia_anexada: false,
    lista_nomes_raw: values.listaNomesRaw || null,
    lista_nomes_raw_anexada: Boolean(values.listaNomesRaw?.trim()),
    manga: text("manga") || null,
    material: values.material || null,
    metadados: null,
    numero_venda: text("numeroVenda") || null,
    observacoes: values.observacoes ? sanitizeObservationHtmlInBrowser(values.observacoes) : null,
    observacoes_html: null,
    reforco_gola: values.reforcoGola || null,
    status: "pendente",
    updated_at: new Date().toISOString(),
    vendedor: text("vendedor") || null,
  } as FichaDetail;
}
