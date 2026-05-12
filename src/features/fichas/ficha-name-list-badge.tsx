"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { DataTable, Modal } from "@/components/ui";
import type { UniformList, UniformListItem } from "@/lib/ai/schemas/uniform-list";

type FichaNameListBadgeProps = {
  fichaId: string;
  tipo: "bruta" | "organizada";
};

type NameListApiResponse =
  | {
      success: true;
      ficha: {
        id: string;
        label: string;
      };
      lista: string | SavedUniformList;
      tipo: "bruta" | "organizada";
    }
  | {
      success: false;
      error: string;
    };

type SavedUniformList = UniformList & {
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

type LoadedList = Extract<NameListApiResponse, { success: true }>;
type ActiveCopyCell = {
  field: "nome" | "numero";
  rowKey: string;
};
type SizeSortDirection = "ascending" | "descending";

const SIZE_ORDER = new Map(
  [
    "P",
    "M",
    "G",
    "GG",
    "XG",
    "XGG",
    "EXG",
    "EG",
    "EGG",
    "EGGG",
    "EEG",
    "EEGG",
    "EEGGG",
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
  ].map((size, index) => [size, index]),
);

const baseOrganizedColumns = [
  { key: "nome", label: "Nome", width: "160px" },
  { key: "numero", label: "Numero", width: "104px" },
  { key: "tamanho", label: "Tamanho", width: "116px" },
  { key: "modelo", label: "Modelo", width: "132px" },
  { key: "confianca", label: "Confianca", width: "116px" },
  { key: "observacao", label: "Observacao", width: "340px" },
];

function displayValue(value: string | null | undefined) {
  return value && value.length > 0 ? value : "-";
}

function formatModel(value: string) {
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

function formatConfidence(value: string) {
  const labels: Record<string, string> = {
    alta: "Alta",
    baixa: "Baixa",
    media: "Media",
  };

  return labels[value] ?? value;
}

function normalizeSize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function getSizeSortParts(item: UniformListItem) {
  const size = normalizeSize(item.tamanho);
  const numericSize = /^\d+$/.test(size) ? Number(size) : null;
  const modelBlock = item.modelo === "baby_look" ? 1 : 0;

  if (numericSize !== null) {
    return {
      modelBlock,
      order: numericSize,
      section: 0,
      text: size,
    };
  }

  return {
    modelBlock,
    order: SIZE_ORDER.get(size) ?? 999,
    section: 1,
    text: size,
  };
}

function compareBySize(first: UniformListItem, second: UniformListItem, direction: SizeSortDirection) {
  const firstParts = getSizeSortParts(first);
  const secondParts = getSizeSortParts(second);
  const result =
    firstParts.modelBlock - secondParts.modelBlock ||
    firstParts.section - secondParts.section ||
    firstParts.order - secondParts.order ||
    firstParts.text.localeCompare(secondParts.text, "pt-BR", { numeric: true, sensitivity: "base" }) ||
    displayValue(first.nome).localeCompare(displayValue(second.nome), "pt-BR", { numeric: true, sensitivity: "base" });

  return direction === "ascending" ? result : -result;
}

async function copyToClipboard(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copiado`, {
    description: value,
  });
}

function ConfidenceBadge({ value }: { value: string }) {
  const label = formatConfidence(value);

  return (
    <div className={`ai-demo__confidence ai-demo__confidence--${value}`}>
      <span className="ai-demo__confidence-badge">{label}</span>
    </div>
  );
}

function CopyCell({
  isActive,
  label,
  onActivate,
  value,
}: {
  isActive: boolean;
  label: string;
  onActivate: () => void;
  value: string | null | undefined;
}) {
  if (!value) return displayValue(value);

  return (
    <button
      className={["ai-demo__copy-cell", isActive ? "ai-demo__copy-cell--active" : null].filter(Boolean).join(" ")}
      onClick={() => {
        onActivate();
        void copyToClipboard(value, label);
      }}
      type="button"
    >
      {value}
    </button>
  );
}

function isOrganizedList(value: LoadedList["lista"]): value is SavedUniformList {
  return typeof value === "object" && value !== null && "items" in value;
}

export function FichaNameListBadge({ fichaId, tipo }: FichaNameListBadgeProps) {
  const [activeCopyCell, setActiveCopyCell] = useState<ActiveCopyCell | null>(null);
  const [loadedList, setLoadedList] = useState<LoadedList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sizeSortDirection, setSizeSortDirection] = useState<SizeSortDirection | null>(null);
  const tone = tipo === "organizada" ? "success" : "warning";
  const label = tipo === "organizada" ? "Lista organizada" : "Lista pendente";
  const title = tipo === "organizada" ? "Lista organizada" : "Lista bruta";
  const organizedColumns = useMemo(
    () =>
      baseOrganizedColumns.map((column) =>
        column.key === "tamanho"
          ? {
              ...column,
              onSort: () => setSizeSortDirection((current) => (current === "ascending" ? "descending" : "ascending")),
              sortDirection: sizeSortDirection ?? undefined,
            }
          : column,
      ),
    [sizeSortDirection],
  );
  const organizedItems = useMemo(() => {
    if (!loadedList || !isOrganizedList(loadedList.lista)) return [];
    return sizeSortDirection ? [...loadedList.lista.items].sort((first, second) => compareBySize(first, second, sizeSortDirection)) : loadedList.lista.items;
  }, [loadedList, sizeSortDirection]);

  async function handleOpen() {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/fichas/${encodeURIComponent(fichaId)}/listas-nomes?tipo=${tipo}`);
      const payload = (await response.json().catch(() => null)) as NameListApiResponse | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.success === false ? payload.error : "Nao foi possivel carregar a lista.");
      }

      setActiveCopyCell(null);
      setSizeSortDirection(null);
      setLoadedList(payload);
    } catch (error) {
      toast.error("Nao foi possivel carregar lista", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        aria-label={`Abrir ${label.toLowerCase()}`}
        className={`ui-badge ui-badge--${tone} ficha-row__meta-badge ficha-name-list-badge`}
        disabled={isLoading}
        onClick={handleOpen}
        type="button"
      >
        {isLoading ? <span className="button-spinner" aria-hidden="true" /> : <ClipboardList aria-hidden="true" size={13} />}
        {isLoading ? "Carregando..." : label}
      </button>

      {loadedList ? (
        <Modal description={`Consulta da ${title.toLowerCase()} vinculada a ficha.`} onClose={() => setLoadedList(null)} size="lg" title={title}>
          <section className="name-list-view-modal">
            <header className="name-list-view-modal__header">
              <div>
                <span>{loadedList.ficha.label}</span>
                <h2>{title}</h2>
              </div>
            </header>

            {loadedList.tipo === "organizada" && isOrganizedList(loadedList.lista) ? (
              <div className="name-list-view-modal__table">
                <DataTable caption="Lista organizada" className="name-list-view-modal__organized-table" columns={organizedColumns}>
                  {organizedItems.map((item, index) => (
                    <OrganizedListRow
                      activeCopyCell={activeCopyCell}
                      item={item}
                      key={`${item.nome ?? "nome"}-${item.numero ?? "numero"}-${index}`}
                      rowKey={`${item.nome ?? "nome"}-${item.numero ?? "numero"}-${index}`}
                      setActiveCopyCell={setActiveCopyCell}
                    />
                  ))}
                </DataTable>
              </div>
            ) : (
              <pre className="name-list-view-modal__raw">{typeof loadedList.lista === "string" ? loadedList.lista : ""}</pre>
            )}
          </section>
        </Modal>
      ) : null}
    </>
  );
}

function OrganizedListRow({
  activeCopyCell,
  item,
  rowKey,
  setActiveCopyCell,
}: {
  activeCopyCell: ActiveCopyCell | null;
  item: UniformListItem;
  rowKey: string;
  setActiveCopyCell: (value: ActiveCopyCell) => void;
}) {
  return (
    <tr>
      <td
        className={[
          "ui-table__primary ai-demo__copy-td",
          activeCopyCell?.rowKey === rowKey && activeCopyCell.field === "nome" ? "ai-demo__copy-td--active" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CopyCell
          isActive={activeCopyCell?.rowKey === rowKey && activeCopyCell.field === "nome"}
          label="Nome"
          onActivate={() => setActiveCopyCell({ field: "nome", rowKey })}
          value={item.nome}
        />
      </td>
      <td
        className={[
          "ai-demo__copy-td",
          activeCopyCell?.rowKey === rowKey && activeCopyCell.field === "numero" ? "ai-demo__copy-td--active" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CopyCell
          isActive={activeCopyCell?.rowKey === rowKey && activeCopyCell.field === "numero"}
          label="Numero"
          onActivate={() => setActiveCopyCell({ field: "numero", rowKey })}
          value={item.numero}
        />
      </td>
      <td>{displayValue(item.tamanho)}</td>
      <td>{formatModel(item.modelo)}</td>
      <td>
        <ConfidenceBadge value={item.confianca} />
      </td>
      <td>{displayValue(item.observacao)}</td>
    </tr>
  );
}
