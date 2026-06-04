"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Printer } from "lucide-react";
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
        clienteNome: string;
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
    ["RN"],
    ["1"],
    ["2"],
    ["4"],
    ["6"],
    ["PP"],
    ["P"],
    ["M"],
    ["G"],
    ["GG"],
    ["52"],
    ["54"],
    ["56"],
    ["ESP1"],
    ["ESP2"],
  ].flatMap((sizes, index) => sizes.map((size) => [size, index] as const)),
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
  const explicitOrder = SIZE_ORDER.get(size);
  const numericSize = /^\d+$/.test(size) ? Number(size) : null;
  const modelBlock = item.modelo === "baby_look" ? 1 : 0;

  if (explicitOrder !== undefined) {
    return {
      modelBlock,
      order: explicitOrder,
      section: 0,
      text: size,
    };
  }

  if (numericSize !== null) {
    return {
      modelBlock,
      order: numericSize,
      section: 1,
      text: size,
    };
  }

  return {
    modelBlock,
    order: 999,
    section: 2,
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

function getFichaContextLabel(label: string) {
  const context = label.split(" - ")[0]?.trim() || label;
  return context === "Sem venda" ? "-" : context;
}

function getFichaClientName(ficha: LoadedList["ficha"]) {
  return ficha.clienteNome?.trim() || ficha.label.split(" - ").slice(1).join(" - ").trim() || ficha.label;
}

function escapeHtml(value: string | null | undefined) {
  return displayValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildNameListPrintHtml(input: {
  items: UniformListItem[];
  label: string;
  rawText: string;
  title: string;
  tipo: LoadedList["tipo"];
}) {
  const body =
    input.tipo === "organizada"
      ? `
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Numero</th>
              <th>Tamanho</th>
              <th>Modelo</th>
              <th>Confianca</th>
              <th>Observacao</th>
            </tr>
          </thead>
          <tbody>
            ${input.items
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.nome)}</td>
                    <td>${escapeHtml(item.numero)}</td>
                    <td>${escapeHtml(item.tamanho)}</td>
                    <td>${escapeHtml(formatModel(item.modelo))}</td>
                    <td>${escapeHtml(formatConfidence(item.confianca))}</td>
                    <td>${escapeHtml(item.observacao)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      `
      : `<pre>${escapeHtml(input.rawText)}</pre>`;

  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(input.title)}</title>
        <style>
          @page { margin: 12mm; }
          * { box-sizing: border-box; }
          body { color: #111827; font-family: Arial, sans-serif; font-size: 12px; margin: 0; }
          header { display: grid; gap: 4px; margin-bottom: 12px; }
          header span { color: #4b5563; font-size: 11px; font-weight: 700; }
          h1 { font-size: 18px; line-height: 1.2; margin: 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 6px 7px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; }
          td:nth-child(2), td:nth-child(3), td:nth-child(5) { text-align: center; }
          pre { border: 1px solid #d1d5db; font-family: "Courier New", monospace; font-size: 12px; line-height: 1.45; margin: 0; padding: 10px; white-space: pre-wrap; word-break: break-word; }
        </style>
      </head>
      <body>
        <header>
          <span>${escapeHtml(input.label)}</span>
          <h1>${escapeHtml(input.title)}</h1>
        </header>
        ${body}
      </body>
    </html>`;
}

function printNameList(input: Parameters<typeof buildNameListPrintHtml>[0]) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.inset = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";

  document.body.appendChild(frame);
  const printDocument = frame.contentDocument;
  const printWindow = frame.contentWindow;

  if (!printDocument || !printWindow) {
    frame.remove();
    toast.error("Nao foi possivel abrir a impressao", {
      description: "Tente novamente.",
    });
    return;
  }

  printDocument.open();
  printDocument.write(buildNameListPrintHtml(input));
  printDocument.close();

  const cleanup = () => {
    window.setTimeout(() => frame.remove(), 500);
  };

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    cleanup();
  }, 50);
}

export function FichaNameListBadge({ fichaId, tipo }: FichaNameListBadgeProps) {
  const [activeCopyCell, setActiveCopyCell] = useState<ActiveCopyCell | null>(null);
  const [loadedList, setLoadedList] = useState<LoadedList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sizeSortDirection, setSizeSortDirection] = useState<SizeSortDirection | null>(null);
  const tone = tipo === "organizada" ? "success" : "warning";
  const label = tipo === "organizada" ? "Lista organizada" : "Lista pendente";
  const title = tipo === "organizada" ? "Lista organizada" : "Lista bruta";
  const displayTitle = loadedList ? `Lista - ${getFichaClientName(loadedList.ficha)}` : title;
  const contextLabel = loadedList ? getFichaContextLabel(loadedList.ficha.label) : "";
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
        <Modal description="Consulta da lista vinculada a ficha." onClose={() => setLoadedList(null)} size="lg" title={displayTitle}>
          <section className="name-list-view-modal">
            <header className="name-list-view-modal__header">
              <div>
                <span className="ui-badge ui-badge--info name-list-view-modal__context">{contextLabel}</span>
                <h2>{displayTitle}</h2>
              </div>
              <button
                className="ui-button ui-button--secondary name-list-view-modal__print"
                onClick={() =>
                  printNameList({
                    items: organizedItems,
                    label: contextLabel,
                    rawText: typeof loadedList.lista === "string" ? loadedList.lista : "",
                    title: displayTitle,
                    tipo: loadedList.tipo,
                  })
                }
                type="button"
              >
                <Printer aria-hidden="true" size={17} />
                Imprimir lista
              </button>
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
