"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  CaseLower,
  CaseSensitive,
  CaseUpper,
  ClipboardList,
  FileSpreadsheet,
  Printer,
  RemoveFormatting,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, Modal } from "@/components/ui";
import { buildUniformCorelCsv, buildUniformCorelCsvFilename } from "@/lib/ai/uniform-list-csv";
import { printUniformList } from "@/lib/ai/uniform-list-print";
import type { UniformList, UniformListItem } from "@/lib/ai/schemas/uniform-list";
import { transformNameCase, type NameCaseMode } from "@/lib/name-case";
import { compareUniformSizeAndModel } from "@/lib/uniform-sizes";

type FichaNameListBadgeProps = {
  appearance?: "badge" | "menu-item";
  fichaId: string;
  labelOverride?: string;
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

const NAME_CASE_OPTIONS: { icon: LucideIcon; label: string; mode: NameCaseMode }[] = [
  { icon: RemoveFormatting, label: "Original", mode: "original" },
  { icon: CaseSensitive, label: "Capitalizar", mode: "capitalized" },
  { icon: CaseUpper, label: "Maiúsculas", mode: "uppercase" },
  { icon: CaseLower, label: "Minúsculas", mode: "lowercase" },
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

function compareBySize(first: UniformListItem, second: UniformListItem, direction: SizeSortDirection) {
  const result =
    compareUniformSizeAndModel(first, second) ||
    displayValue(first.nome).localeCompare(displayValue(second.nome), "pt-BR", { numeric: true, sensitivity: "base" });

  return direction === "ascending" ? result : -result;
}

async function copyToClipboard(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copiado`, {
    description: value,
  });
}

function ConfidenceDot({ value }: { value: string }) {
  const label = formatConfidence(value);

  return (
    <span className={`confidence-dot confidence-dot--${value}`} title={`Confiança: ${label}`}>
      <span aria-hidden="true" className="confidence-dot__mark" />
      <span className="sr-only">{label}</span>
    </span>
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

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportNameListCsv(items: UniformListItem[], clienteNome: string, grupo?: string | null) {
  saveBlob(
    new Blob([buildUniformCorelCsv(items)], {
      type: "text/csv;charset=utf-8",
    }),
    buildUniformCorelCsvFilename(clienteNome, grupo),
  );
}

export function FichaNameListBadge({ appearance = "badge", fichaId, labelOverride, tipo }: FichaNameListBadgeProps) {
  const [activeCopyCell, setActiveCopyCell] = useState<ActiveCopyCell | null>(null);
  const [loadedList, setLoadedList] = useState<LoadedList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sizeSortDirection, setSizeSortDirection] = useState<SizeSortDirection | null>(null);
  const [nameCaseMode, setNameCaseMode] = useState<NameCaseMode>("original");
  const [showRawList, setShowRawList] = useState(false);
  const [selectedCsvRows, setSelectedCsvRows] = useState<Set<UniformListItem>>(() => new Set());
  const tone = tipo === "organizada" ? "success" : "warning";
  const label = tipo === "organizada" ? "Lista organizada" : "Lista pendente";
  const buttonLabel = labelOverride ?? label;
  const title = tipo === "organizada" ? "Lista organizada" : "Lista bruta";
  const displayTitle = loadedList ? `Lista - ${getFichaClientName(loadedList.ficha)}` : title;
  const contextLabel = loadedList ? getFichaContextLabel(loadedList.ficha.label) : "";
  const rawText = loadedList
    ? typeof loadedList.lista === "string"
      ? loadedList.lista
      : loadedList.lista.sourceText?.trim() ?? ""
    : "";
  const itemCount = loadedList
    ? isOrganizedList(loadedList.lista)
      ? loadedList.lista.items.length
      : rawText.split(/\r?\n/).filter((line) => line.trim()).length
    : 0;
  const organizedItems = useMemo(() => {
    if (!loadedList || !isOrganizedList(loadedList.lista)) return [];
    return sizeSortDirection ? [...loadedList.lista.items].sort((first, second) => compareBySize(first, second, sizeSortDirection)) : loadedList.lista.items;
  }, [loadedList, sizeSortDirection]);
  const displayedOrganizedItems = useMemo(
    () =>
      organizedItems.map((item) => ({
        ...item,
        nome: nameCaseMode === "original" ? item.nome : transformNameCase(item.nome, nameCaseMode),
      })),
    [nameCaseMode, organizedItems],
  );
  const selectedCsvItems = displayedOrganizedItems.filter((_, index) => selectedCsvRows.has(organizedItems[index]));
  const groupEntries = useMemo(() => {
    const groups = new Map<string, UniformListItem[]>();
    organizedItems.forEach((item) => {
      const group = item.grupo?.trim() || "Sem grupo";
      groups.set(group, [...(groups.get(group) ?? []), item]);
    });
    return Array.from(groups.entries());
  }, [organizedItems]);
  const hasDistinctGroups = useMemo(
    () => new Set(organizedItems.map((item) => item.grupo?.trim() || "")).size > 1,
    [organizedItems],
  );
  const allRowsSelected = organizedItems.length > 0 && selectedCsvItems.length === organizedItems.length;
  const someRowsSelected = selectedCsvItems.length > 0 && !allRowsSelected;
  const organizedColumns = useMemo(() => {
    const columns = [
      {
        key: "exportar",
        width: "54px",
        align: "center" as const,
        label: (
          <input
            aria-label={allRowsSelected ? "Desmarcar todos para o CSV" : "Marcar todos para o CSV"}
            checked={allRowsSelected}
            onChange={() => setSelectedCsvRows(allRowsSelected ? new Set() : new Set(organizedItems))}
            ref={(element) => {
              if (element) element.indeterminate = someRowsSelected;
            }}
            type="checkbox"
          />
        ),
      },
      { key: "nome", label: "Nome" },
      { key: "numero", label: "Numero", align: "center" as const },
      {
        key: "tamanho",
        label: "Tamanho",
        align: "center" as const,
        onSort: () => setSizeSortDirection((current) => (current === "ascending" ? "descending" : "ascending")),
        sortDirection: sizeSortDirection ?? undefined,
      },
      { key: "modelo", label: "Modelo" },
      { key: "confianca", label: "Confianca", align: "center" as const },
      ...(hasDistinctGroups ? [{ key: "grupo", label: "Grupo" }] : []),
      { key: "observacao", label: "Observacao" },
    ];
    return columns;
  }, [allRowsSelected, hasDistinctGroups, organizedItems, sizeSortDirection, someRowsSelected]);

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
      setNameCaseMode("original");
      setShowRawList(false);
      setSelectedCsvRows(new Set(isOrganizedList(payload.lista) ? payload.lista.items : []));
      setLoadedList(payload);
    } catch (error) {
      toast.error("Nao foi possivel carregar lista", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const toggleCsvItem = useCallback((item: UniformListItem) => {
    setSelectedCsvRows((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }, []);

  const toggleCsvGroup = useCallback((items: UniformListItem[]) => {
    setSelectedCsvRows((current) => {
      const next = new Set(current);
      const groupSelected = items.every((item) => next.has(item));
      items.forEach((item) => (groupSelected ? next.delete(item) : next.add(item)));
      return next;
    });
  }, []);

  function exportSelectedGroups() {
    groupEntries.forEach(([group, sourceItems]) => {
      const selectedSourceItems = sourceItems.filter((item) => selectedCsvRows.has(item));
      if (selectedSourceItems.length === 0) return;
      const exportedItems = selectedSourceItems.map((sourceItem) => {
        const itemIndex = organizedItems.indexOf(sourceItem);
        return displayedOrganizedItems[itemIndex];
      });
      exportNameListCsv(exportedItems, loadedList?.ficha.clienteNome ?? "cliente", group);
    });
  }

  return (
    <>
      <button
        aria-label={`Abrir ${buttonLabel.toLowerCase()}`}
        className={
          appearance === "menu-item"
            ? "floating-menu__item"
            : `ui-badge ui-badge--${tone} ficha-row__meta-badge ficha-name-list-badge`
        }
        data-keep-floating-menu-open={appearance === "menu-item" ? "true" : undefined}
        role={appearance === "menu-item" ? "menuitem" : undefined}
        disabled={isLoading}
        onClick={handleOpen}
        type="button"
      >
        {isLoading ? <span className="button-spinner" aria-hidden="true" /> : <ClipboardList aria-hidden="true" size={appearance === "menu-item" ? 16 : 13} />}
        {isLoading ? "Carregando..." : buttonLabel}
      </button>

      {loadedList ? (
        <Modal description="Consulta da lista vinculada a ficha." onClose={() => setLoadedList(null)} size="lg" title={displayTitle}>
          <section className="name-list-view-modal">
            <header className="name-list-view-modal__header">
              <div className="name-list-view-modal__heading">
                <h2>{displayTitle}</h2>
                <p className="name-list-view-modal__count">{itemCount} {itemCount === 1 ? "item" : "itens"}</p>
              </div>
              <div className="name-list-view-modal__toolbar">
                <div className="name-list-view-modal__toolbar-start">
                  {loadedList.tipo === "organizada" && isOrganizedList(loadedList.lista) ? (
                    <>
                      <div className="format-toolbar" role="group" aria-label="Formato dos nomes">
                        {NAME_CASE_OPTIONS.map(({ icon: Icon, label: optionLabel, mode }) => (
                          <button
                            aria-label={optionLabel}
                            className={["format-toolbar__button", nameCaseMode === mode ? "is-active" : null]
                              .filter(Boolean)
                              .join(" ")}
                            data-active={nameCaseMode === mode ? "true" : undefined}
                            key={mode}
                            onClick={() => setNameCaseMode(mode)}
                            title={optionLabel}
                            type="button"
                          >
                            <Icon aria-hidden="true" size={16} />
                          </button>
                        ))}
                      </div>
                      {rawText ? (
                        <label className="name-list-view-modal__raw-toggle">
                          <input checked={showRawList} onChange={(event) => setShowRawList(event.target.checked)} type="checkbox" />
                          Comparar com a lista bruta
                        </label>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="name-list-view-modal__output-actions">
                  {loadedList.tipo === "bruta" ? (
                    <a className="ui-button ui-button--primary" href={`/ferramentas/organizar-nomes-ia?fichaId=${encodeURIComponent(fichaId)}`}>
                      <WandSparkles aria-hidden="true" size={17} />
                      Organizar com IA
                    </a>
                  ) : null}
                  {loadedList.tipo === "organizada" && isOrganizedList(loadedList.lista) ? (
                    <>
                      <button
                        className="ui-button ui-button--primary name-list-view-modal__csv"
                        disabled={selectedCsvItems.length === 0}
                        onClick={() => exportNameListCsv(selectedCsvItems, loadedList.ficha.clienteNome)}
                        type="button"
                      >
                        <FileSpreadsheet aria-hidden="true" size={17} />
                        Exportar {selectedCsvItems.length} para CSV
                      </button>
                      {groupEntries.some(([group]) => group !== "Sem grupo") ? (
                        <button
                          className="ui-button ui-button--secondary"
                          disabled={selectedCsvItems.length === 0}
                          onClick={exportSelectedGroups}
                          type="button"
                        >
                          <FileSpreadsheet aria-hidden="true" size={17} />
                          Exportar separado por grupo
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  <button
                    className="ui-button ui-button--secondary name-list-view-modal__print"
                    onClick={() => {
                      const opened = printUniformList({
                        items: displayedOrganizedItems,
                        label: contextLabel,
                        rawText: typeof loadedList.lista === "string" ? loadedList.lista : "",
                        showGroup: hasDistinctGroups,
                        title: displayTitle,
                        tipo: loadedList.tipo,
                      });
                      if (!opened) {
                        toast.error("Nao foi possivel abrir a impressao", { description: "Tente novamente." });
                      }
                    }}
                    type="button"
                  >
                    <Printer aria-hidden="true" size={17} />
                    Imprimir
                  </button>
                </div>
              </div>
              {loadedList.tipo === "organizada" && isOrganizedList(loadedList.lista) && hasDistinctGroups ? (
                <div className="name-list-view-modal__groups" aria-label="Selecionar grupos para exportação">
                  <span>Grupos</span>
                  <div>
                    {groupEntries.map(([group, items]) => (
                      <label key={group}>
                        <input
                          checked={items.every((item) => selectedCsvRows.has(item))}
                          onChange={() => toggleCsvGroup(items)}
                          ref={(element) => {
                            if (element) {
                              const selectedCount = items.filter((item) => selectedCsvRows.has(item)).length;
                              element.indeterminate = selectedCount > 0 && selectedCount < items.length;
                            }
                          }}
                          type="checkbox"
                        />
                        {group} ({items.length})
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </header>

            {loadedList.tipo === "organizada" && isOrganizedList(loadedList.lista) ? (
              <div className={showRawList ? "name-list-view-modal__comparison" : undefined}>
                <div className="name-list-view-modal__table">
                  <DataTable caption="Lista organizada" className="name-list-view-modal__organized-table" columns={organizedColumns}>
                    {displayedOrganizedItems.map((item, index) => (
                      <OrganizedListRow
                        activeCopyField={activeCopyCell?.rowKey === `${item.nome ?? "nome"}-${item.numero ?? "numero"}-${index}` ? activeCopyCell.field : null}
                        csvSelected={selectedCsvRows.has(organizedItems[index])}
                        item={item}
                        key={`${item.nome ?? "nome"}-${item.numero ?? "numero"}-${index}`}
                        rowKey={`${item.nome ?? "nome"}-${item.numero ?? "numero"}-${index}`}
                        onToggleCsvItem={toggleCsvItem}
                        showGroup={hasDistinctGroups}
                        sourceItem={organizedItems[index]}
                        setActiveCopyCell={setActiveCopyCell}
                      />
                    ))}
                  </DataTable>
                </div>
                {showRawList ? (
                  <div className="name-list-view-modal__raw-panel">
                    <h3>Lista bruta</h3>
                    <pre className="name-list-view-modal__raw">{rawText}</pre>
                  </div>
                ) : null}
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

const OrganizedListRow = memo(function OrganizedListRow({
  activeCopyField,
  csvSelected,
  item,
  onToggleCsvItem,
  rowKey,
  setActiveCopyCell,
  showGroup,
  sourceItem,
}: {
  activeCopyField: ActiveCopyCell["field"] | null;
  csvSelected: boolean;
  item: UniformListItem;
  onToggleCsvItem: (item: UniformListItem) => void;
  rowKey: string;
  setActiveCopyCell: (value: ActiveCopyCell) => void;
  showGroup: boolean;
  sourceItem: UniformListItem;
}) {
  return (
    <tr>
      <td className="name-list-view-modal__cell--center">
        <input aria-label={`Incluir ${item.nome || "linha"} no CSV`} checked={csvSelected} onChange={() => onToggleCsvItem(sourceItem)} type="checkbox" />
      </td>
      <td
        className={[
          "ui-table__primary ai-demo__copy-td",
          activeCopyField === "nome" ? "ai-demo__copy-td--active" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CopyCell
          isActive={activeCopyField === "nome"}
          label="Nome"
          onActivate={() => setActiveCopyCell({ field: "nome", rowKey })}
          value={item.nome}
        />
      </td>
      <td
        className={[
          "ai-demo__copy-td name-list-view-modal__cell--center",
          activeCopyField === "numero" ? "ai-demo__copy-td--active" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CopyCell
          isActive={activeCopyField === "numero"}
          label="Numero"
          onActivate={() => setActiveCopyCell({ field: "numero", rowKey })}
          value={item.numero}
        />
      </td>
      <td className="name-list-view-modal__cell--center">{displayValue(item.tamanho)}</td>
      <td>{formatModel(item.modelo)}</td>
      <td className="name-list-view-modal__cell--center">
        <ConfidenceDot value={item.confianca} />
      </td>
      {showGroup ? <td>{displayValue(item.grupo)}</td> : null}
      <td>{displayValue(item.observacao)}</td>
    </tr>
  );
});
