"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { ClipboardList, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button, DataTable } from "@/components/ui";
import { AI_MODEL_OPTIONS } from "@/lib/ai/model-options";
import { getBusinessTodayInput } from "@/lib/dates";
import type { UniformList, UniformListItem } from "@/lib/ai/schemas/uniform-list";

type ApiSuccess = {
  success: true;
  data: UniformList;
};

type ApiError = {
  success: false;
  code?: string;
  error: string;
};

type ApiResponse = ApiSuccess | ApiError;

const MAX_TEXT_LENGTH = 10_000;
const REVIEW_MESSAGE = "Revise antes de salvar.";

type SortDirection = "ascending" | "descending";
type SortKey = "confianca" | "modelo" | "nome" | "numero" | "observacao" | "tamanho";
type ActiveCopyCell = {
  field: "nome" | "numero";
  rowKey: string;
};

const baseColumns: Array<{ key: SortKey; label: string; width: string }> = [
  { key: "nome", label: "Nome", width: "160px" },
  { key: "numero", label: "Número", width: "104px" },
  { key: "tamanho", label: "Tamanho", width: "116px" },
  { key: "modelo", label: "Modelo", width: "132px" },
  { key: "confianca", label: "Confiança", width: "116px" },
  { key: "observacao", label: "Observação", width: "340px" },
];

const exportHeaders = baseColumns.map((column) => column.label);
const sortCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

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
    media: "Média",
  };

  return labels[value] ?? value;
}

function getSortValue(item: UniformListItem, key: SortKey) {
  const values: Record<SortKey, string> = {
    confianca: formatConfidence(item.confianca),
    modelo: formatModel(item.modelo),
    nome: displayValue(item.nome),
    numero: displayValue(item.numero),
    observacao: displayValue(item.observacao),
    tamanho: displayValue(item.tamanho),
  };

  return values[key];
}

function sortItems(items: UniformListItem[], key: SortKey, direction: SortDirection) {
  return [...items].sort((first, second) => {
    const result = sortCollator.compare(getSortValue(first, key), getSortValue(second, key));
    return direction === "ascending" ? result : -result;
  });
}

function getExportRows(items: UniformListItem[]) {
  return items.map((item) => [
    displayValue(item.nome),
    displayValue(item.numero),
    displayValue(item.tamanho),
    formatModel(item.modelo),
    formatConfidence(item.confianca),
    displayValue(item.observacao),
  ]);
}

function getExportFilename() {
  return `lista-uniformes-${getBusinessTodayInput()}.xlsx`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copiado`, {
    description: value,
  });
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

  const className = ["ai-demo__copy-cell", isActive ? "ai-demo__copy-cell--active" : null].filter(Boolean).join(" ");

  return (
    <button
      className={className}
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

function ConfidenceBadge({ value }: { value: string }) {
  const label = formatConfidence(value);

  return (
    <div className={`ai-demo__confidence ai-demo__confidence--${value}`}>
      <span className="ai-demo__confidence-badge">{label}</span>
    </div>
  );
}

function getApiErrorMessage(response: Response, payload: ApiResponse | null) {
  if (payload && !payload.success) {
    return payload.error;
  }

  if (response.status === 413) {
    return "A lista é grande demais para processar de uma vez.";
  }

  if (response.status === 504) {
    return "A lista demorou demais para processar. Tente dividir em blocos menores.";
  }

  return "Não foi possível organizar a lista.";
}

export function UniformListParserDemo({ defaultModelValue }: { defaultModelValue: string }) {
  const textareaId = useId();
  const modelSelectId = useId();
  const [text, setText] = useState("");
  const [selectedModel, setSelectedModel] = useState(defaultModelValue);
  const [result, setResult] = useState<UniformList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeCopyCell, setActiveCopyCell] = useState<ActiveCopyCell | null>(null);
  const [sortConfig, setSortConfig] = useState<{ direction: SortDirection; key: SortKey } | null>(null);
  const hasItems = Boolean(result?.items.length);
  const sortedItems = useMemo(
    () => (result ? (sortConfig ? sortItems(result.items, sortConfig.key, sortConfig.direction) : result.items) : []),
    [result, sortConfig],
  );
  const columns = useMemo(
    () =>
      baseColumns.map((column) => ({
        ...column,
        onSort: () =>
          setSortConfig((current) => ({
            direction: current?.key === column.key && current.direction === "ascending" ? "descending" : "ascending",
            key: column.key,
          })),
        sortDirection: sortConfig?.key === column.key ? sortConfig.direction : undefined,
      })),
    [sortConfig],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!text.trim()) {
      setError("Cole uma lista para organizar.");
      return;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      setError("A lista passou do limite de 10000 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/parse-uniform-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ aiModel: selectedModel, text }),
      });

      const payload = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !payload?.success) {
        const message = getApiErrorMessage(response, payload);
        setError(message);
        toast.error("Falha ao organizar lista", {
          description: message,
        });
        return;
      }

      setActiveCopyCell(null);
      setResult(payload.data);
    } catch {
      const message = "Não foi possível organizar a lista.";
      setError(message);
      toast.error("Falha ao organizar lista", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportXlsx() {
    if (!result?.items.length) return;

    setIsExporting(true);

    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet("Lista organizada", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      sheet.addRow(exportHeaders);
      getExportRows(sortedItems).forEach((row) => sheet.addRow(row));

      sheet.columns = [
        { width: 24 },
        { width: 14 },
        { width: 14 },
        { width: 16 },
        { width: 14 },
        { width: 44 },
      ];
      sheet.autoFilter = { from: "A1", to: "F1" };

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1D4ED8" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
      });

      sheet.eachRow((row, rowNumber) => {
        row.height = rowNumber === 1 ? 24 : 28;
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", wrapText: true };
          cell.border = {
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
          };

          if (rowNumber > 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: rowNumber % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF" },
            };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        getExportFilename(),
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="ai-demo" aria-labelledby={`${textareaId}-title`}>
      <div className="ai-demo__workspace">
        <form className="ai-demo__form" onSubmit={handleSubmit}>
          <div className="ai-demo__header">
            <div>
              <h2 id={`${textareaId}-title`}>Organizar lista</h2>
              <p>{REVIEW_MESSAGE}</p>
            </div>
            <div className="ai-demo__actions">
              <label className="ai-demo__model-select" htmlFor={modelSelectId}>
                <span>Modelo</span>
                <select
                  disabled={isLoading}
                  id={modelSelectId}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  value={selectedModel}
                >
                  {AI_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button aria-disabled={isLoading} disabled={isLoading} type="submit">
                {isLoading ? <span className="button-spinner" aria-hidden="true" /> : <ClipboardList aria-hidden="true" size={18} />}
                {isLoading ? "Organizando..." : "Organizar lista"}
              </Button>
            </div>
          </div>

          <div className="field ai-demo__input">
            <label htmlFor={textareaId}>Lista recebida</label>
            <textarea
              id={textareaId}
              maxLength={MAX_TEXT_LENGTH}
              onChange={(event) => setText(event.target.value)}
              placeholder="Cole a lista aqui..."
              rows={18}
              value={text}
            />
          </div>

        </form>

        <div className="ai-demo__result" aria-live="polite">
          <div className="ai-demo__result-header">
            <div>
              <h2>Resultado</h2>
              <p>{hasItems ? `${result?.items.length} itens` : "Nenhum item"}</p>
            </div>
            <div className="ai-demo__exports" aria-label="Exportar lista organizada">
              <Button
                aria-disabled={!hasItems || isExporting}
                disabled={!hasItems || isExporting}
                onClick={handleExportXlsx}
                type="button"
                variant="secondary"
              >
                {isExporting ? <span className="button-spinner" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" size={17} />}
                Exportar para Excel
              </Button>
            </div>
          </div>

          {error ? (
            <p className="ai-demo__feedback ai-demo__feedback--error" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <DataTable caption="Lista organizada para revisão" columns={columns}>
              {sortedItems.map((item, index) => {
                const rowKey = `${item.nome ?? "sem-nome"}-${item.numero ?? "sem-numero"}-${item.tamanho ?? "sem-tamanho"}-${index}`;

                return (
                  <tr key={rowKey}>
                    <td className="ui-table__primary ai-demo__copy-td">
                      <CopyCell
                        isActive={activeCopyCell?.rowKey === rowKey && activeCopyCell.field === "nome"}
                        label="Nome"
                        onActivate={() => setActiveCopyCell({ field: "nome", rowKey })}
                        value={item.nome}
                      />
                    </td>
                    <td className="ai-demo__copy-td">
                      <CopyCell
                        isActive={activeCopyCell?.rowKey === rowKey && activeCopyCell.field === "numero"}
                        label="Número"
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
              })}
            </DataTable>
          ) : (
            <div className="ai-demo__empty">
              <strong>Tabela vazia :/</strong>
              <span>Use o campo de texto ao lado para organizar uma lista.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
