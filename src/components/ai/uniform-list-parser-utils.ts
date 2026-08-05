import { CUSTOM_DATALIST_IMAGE_HEIGHT, CUSTOM_DATALIST_IMAGE_WIDTH } from "@/components/ui/custom-datalist";
import { normalizeUniformListGroups } from "@/lib/ai/uniform-list-groups";
import type { UniformList, UniformListItem } from "@/lib/ai/schemas/uniform-list";
import { getCloudinaryTransformedImageUrl } from "@/lib/cloudinary-images";
import { formatShortDateInput } from "@/lib/dates";
import { compareUniformSizeAndModel } from "@/lib/uniform-sizes";

// A miniatura da ficha aparece na lista de sugestoes e ao lado da ficha
// selecionada, entao segue a mesma proporcao do primitivo.
export const FICHA_THUMB_WIDTH = CUSTOM_DATALIST_IMAGE_WIDTH;
export const FICHA_THUMB_HEIGHT = CUSTOM_DATALIST_IMAGE_HEIGHT;

export type SavedUniformList = UniformList & {
  aiModel?: string | null;
  linkedAt: string;
  linkedBy?: {
    displayName: string;
    id: string;
    username: string;
  };
  source: "organizar-nomes-ia";
  sourceText?: string;
  version: 1;
};

export type LinkedFicha = {
  cliente: string;
  dataEntrega: string;
  id: string;
  imagemUrl?: string | null;
  itensTotal?: number | null;
  listaIaAnexada: boolean;
  listaIa?: SavedUniformList | null;
  numeroVenda: string | null;
};

export type SortDirection = "ascending" | "descending";
export type SortKey = "confianca" | "grupo" | "modelo" | "nome" | "numero" | "observacao" | "tamanho";
export type EditableUniformListItem = UniformListItem & { rowId: string };
export type EditableUniformList = { items: EditableUniformListItem[] };
export type EditableTextField = "grupo" | "nome" | "numero" | "observacao" | "tamanho";

const sortCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

export function displayValue(value: string | null | undefined) {
  return value && value.length > 0 ? value : "-";
}

export function formatModel(value: string) {
  const labels: Record<string, string> = {
    baby_look: "Baby Look",
    desconhecido: "Desconhecido",
    infantil: "Infantil",
    polo: "Polo",
    regata: "Regata",
    tradicional: "Camiseta",
  };

  return labels[value] ?? value;
}

export function formatConfidence(value: string) {
  const labels: Record<string, string> = {
    alta: "Alta",
    baixa: "Baixa",
    media: "Média",
  };

  return labels[value] ?? value;
}

function getSortValue(item: UniformListItem, key: SortKey) {
  const values: Record<SortKey, string> = {
    confianca: formatConfidence(item.confianca),
    grupo: displayValue(item.grupo),
    modelo: formatModel(item.modelo),
    nome: displayValue(item.nome),
    numero: displayValue(item.numero),
    observacao: displayValue(item.observacao),
    tamanho: displayValue(item.tamanho),
  };

  return values[key];
}

export function sortItems<T extends UniformListItem>(items: T[], key: SortKey, direction: SortDirection) {
  return [...items].sort((first, second) => {
    const result =
      key === "tamanho"
        ? compareUniformSizeAndModel(first, second) ||
          sortCollator.compare(displayValue(first.nome), displayValue(second.nome))
        : sortCollator.compare(getSortValue(first, key), getSortValue(second, key));
    return direction === "ascending" ? result : -result;
  });
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createRowId(index: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${index}`;
}

export function createEditableList(list: UniformList): EditableUniformList {
  const normalizedList = normalizeUniformListGroups(list);

  return {
    items: normalizedList.items.map((item, index) => ({
      ...item,
      rowId: createRowId(index),
    })),
  };
}

export function stripEditableList(list: EditableUniformList): UniformList {
  return {
    items: list.items.map((item) => ({
      confianca: item.confianca,
      grupo: item.grupo,
      modelo: item.modelo,
      nome: item.nome,
      numero: item.numero,
      observacao: item.observacao,
      tamanho: item.tamanho,
    })),
  };
}

export function getFichaOptionLabel(ficha: LinkedFicha) {
  return ficha.cliente;
}

export function formatFichaItemsTotal(total: number | null | undefined) {
  if (!total) return null;
  return total === 1 ? "1 item" : `${total} itens`;
}

// Ha fichas gravadas com `-` no lugar do numero da venda; sem esta checagem
// elas aparecem como "Venda -".
export function formatFichaVenda(numeroVenda: string | null | undefined) {
  const venda = numeroVenda?.trim() ?? "";
  return /[a-z0-9]/i.test(venda) ? `Venda ${venda}` : null;
}

// O numero da venda entra nos metadados, nao no rotulo: quando nao existe,
// nada e exibido no lugar. A distincao entre pedidos do mesmo cliente vem da
// arte, da entrega e da quantidade.
export function getFichaOptionDetails(ficha: LinkedFicha) {
  return [
    formatFichaVenda(ficha.numeroVenda),
    `Entrega ${formatShortDateInput(ficha.dataEntrega)}`,
    formatFichaItemsTotal(ficha.itensTotal),
    ficha.listaIaAnexada ? "Lista organizada" : "Sem lista",
  ].filter(Boolean) as string[];
}

export function getFichaThumbUrl(ficha: LinkedFicha | null | undefined) {
  return ficha?.imagemUrl ? getCloudinaryTransformedImageUrl(ficha.imagemUrl, FICHA_THUMB_WIDTH, FICHA_THUMB_HEIGHT) : null;
}
