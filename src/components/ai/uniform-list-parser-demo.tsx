"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Check,
  ClipboardList,
  FileSpreadsheet,
  Pencil,
  Printer,
  RemoveFormatting,
  Save,
  Search,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, CustomDatalist, DataTable, type CustomDatalistOption } from "@/components/ui";
import { findAiModelOption } from "@/lib/ai/model-options";
import { buildUniformCorelCsv, buildUniformCorelCsvFilename } from "@/lib/ai/uniform-list-csv";
import { normalizeUniformListGroups } from "@/lib/ai/uniform-list-groups";
import { printUniformList } from "@/lib/ai/uniform-list-print";
import { formatShortDateInput } from "@/lib/dates";
import type { UniformList, UniformListItem } from "@/lib/ai/schemas/uniform-list";
import { transformNameCase, type NameCaseMode } from "@/lib/name-case";
import { compareUniformSizeAndModel } from "@/lib/uniform-sizes";

type ApiSuccess = {
  success: true;
  data: UniformList;
  aiModel: string;
};

type ApiError = {
  success: false;
  code?: string;
  error: string;
};

type ApiResponse = ApiSuccess | ApiError;

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

type LinkedFicha = {
  cliente: string;
  dataEntrega: string;
  id: string;
  listaIaAnexada: boolean;
  listaIa?: SavedUniformList | null;
  numeroVenda: string | null;
};

type LinkApiSuccess = {
  success: true;
  ficha?: LinkedFicha;
  fichas?: LinkedFicha[];
};

type LinkApiError = {
  success: false;
  error: string;
};

type LinkApiResponse = LinkApiSuccess | LinkApiError;

type UniformListParserDemoProps = {
  initialFicha?: LinkedFicha | null;
  initialText?: string;
};

const MAX_TEXT_LENGTH = 10_000;
const REVIEW_MESSAGE = "Revise antes de salvar.";
const MODEL_OPTIONS = ["tradicional", "baby_look", "infantil", "regata", "polo", "desconhecido"] as const;
const CONFIDENCE_OPTIONS = ["alta", "media", "baixa"] as const;

type SortDirection = "ascending" | "descending";
type SortKey = "confianca" | "grupo" | "modelo" | "nome" | "numero" | "observacao" | "tamanho";
type EditableUniformListItem = UniformListItem & { rowId: string };
type EditableUniformList = { items: EditableUniformListItem[] };
type EditableTextField = "grupo" | "nome" | "numero" | "observacao" | "tamanho";
type ActiveCopyCell = {
  field: "nome" | "numero";
  rowKey: string;
};

const COLUMN_META: Record<SortKey, { align?: "center"; label: string }> = {
  nome: { label: "Nome" },
  numero: { label: "Número", align: "center" },
  tamanho: { label: "Tamanho", align: "center" },
  modelo: { label: "Modelo" },
  confianca: { label: "Confiança", align: "center" },
  grupo: { label: "Grupo" },
  observacao: { label: "Observação" },
};

const DISPLAY_COLUMN_ORDER: SortKey[] = ["nome", "numero", "tamanho", "modelo", "confianca", "grupo", "observacao"];

const NAME_CASE_OPTIONS: { icon: LucideIcon; label: string; mode: NameCaseMode }[] = [
  { icon: RemoveFormatting, label: "Original", mode: "original" },
  { icon: CaseSensitive, label: "Capitalizar", mode: "capitalized" },
  { icon: CaseUpper, label: "Maiúsculas", mode: "uppercase" },
  { icon: CaseLower, label: "Minúsculas", mode: "lowercase" },
];

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
    grupo: displayValue(item.grupo),
    modelo: formatModel(item.modelo),
    nome: displayValue(item.nome),
    numero: displayValue(item.numero),
    observacao: displayValue(item.observacao),
    tamanho: displayValue(item.tamanho),
  };

  return values[key];
}

function sortItems<T extends UniformListItem>(items: T[], key: SortKey, direction: SortDirection) {
  return [...items].sort((first, second) => {
    const result =
      key === "tamanho"
        ? compareUniformSizeAndModel(first, second) ||
          sortCollator.compare(displayValue(first.nome), displayValue(second.nome))
        : sortCollator.compare(getSortValue(first, key), getSortValue(second, key));
    return direction === "ascending" ? result : -result;
  });
}

function saveBlob(blob: Blob, filename: string) {
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

function createEditableList(list: UniformList): EditableUniformList {
  const normalizedList = normalizeUniformListGroups(list);

  return {
    items: normalizedList.items.map((item, index) => ({
      ...item,
      rowId: createRowId(index),
    })),
  };
}

function stripEditableList(list: EditableUniformList): UniformList {
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

function getFichaOptionLabel(ficha: LinkedFicha) {
  return `${ficha.numeroVenda ? `Venda ${ficha.numeroVenda}` : "Sem venda"} - ${ficha.cliente}`;
}

function getFichaOptionDetails(ficha: LinkedFicha) {
  return [`Entrega ${formatShortDateInput(ficha.dataEntrega)}`, ficha.listaIaAnexada ? "Lista organizada" : "Sem lista"];
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

function ConfidenceDot({ value }: { value: string }) {
  const label = formatConfidence(value);

  return (
    <span className={`confidence-dot confidence-dot--${value}`} title={`Confiança: ${label}`}>
      <span aria-hidden="true" className="confidence-dot__mark" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function TableGenerationAnimation({ animated = true }: { animated?: boolean }) {
  const items = [
    { id: "item-1", y: 200, titleWidth: 180, subtitleWidth: 100 },
    { id: "item-2", y: 275, titleWidth: 220, subtitleWidth: 120 },
    { id: "item-3", y: 350, titleWidth: 150, subtitleWidth: 80 },
    { id: "item-4", y: 425, titleWidth: 190, subtitleWidth: 110 },
    { id: "item-5", y: 500, titleWidth: 130, subtitleWidth: 70 },
  ];

  return (
    <div
      className={["ai-demo__loading-table", animated ? null : "ai-demo__loading-table--static"].filter(Boolean).join(" ")}
      aria-label={animated ? "Organizando a sua lista" : "Tabela vazia"}
      role={animated ? "status" : "img"}
    >
      <svg aria-hidden="true" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet">
        <rect className="ai-demo__loading-panel" x="350" y="100" width="500" height="500" rx="20" />
        <g className="ai-demo__loading-header">
          <foreignObject x="390" y="124" width="430" height="64">
            <div className="ai-demo__loading-typing">
              {animated ? (
                "Organizando a sua lista..."
              ) : (
                <>
                  Use o campo ao lado para
                  <br />
                  organizar a lista de nomes...
                </>
              )}
            </div>
          </foreignObject>
          <rect x="390" y="192" width="200" height="2" rx="1" opacity="0.45" />
        </g>
        <g className="ai-demo__loading-list">
          {items.map((item, index) => (
            <g
              className="ai-demo__loading-item"
              key={item.id}
              style={{
                animationDelay: `${index * 680}ms`,
              }}
            >
              <rect className="ai-demo__loading-card" x="380" y={item.y} width="440" height="60" rx="12" />
              <rect className="ai-demo__loading-checkbox" x="405" y={item.y + 18} width="24" height="24" rx="4" />
              <path
                className="ai-demo__loading-check"
                d={`M410 ${item.y + 30} L415 ${item.y + 35} L424 ${item.y + 23}`}
                pathLength="20"
              />
              <rect className="ai-demo__loading-line" x="445" y={item.y + 22} width={item.titleWidth} height="6" rx="3" />
              <rect
                className="ai-demo__loading-line"
                x="445"
                y={item.y + 34}
                width={item.subtitleWidth}
                height="4"
                rx="2"
                opacity="0.55"
              />
            </g>
          ))}
        </g>
      </svg>
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

export function UniformListParserDemo({ initialFicha = null, initialText = "" }: UniformListParserDemoProps) {
  const textareaId = useId();
  const fichaInputId = useId();
  const [text, setText] = useState(initialText);
  const [organizingModel, setOrganizingModel] = useState<string | null>(initialFicha?.listaIa?.aiModel ?? null);
  const [result, setResult] = useState<EditableUniformList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [activeCopyCell, setActiveCopyCell] = useState<ActiveCopyCell | null>(null);
  const [nameCaseMode, setNameCaseMode] = useState<NameCaseMode>("original");
  const [linkedFichas, setLinkedFichas] = useState<LinkedFicha[]>(initialFicha ? [initialFicha] : []);
  const [selectedFichaId, setSelectedFichaId] = useState(initialFicha?.id ?? "");
  const [selectedFichaLabel, setSelectedFichaLabel] = useState(initialFicha ? getFichaOptionLabel(initialFicha) : "");
  const [sortConfig, setSortConfig] = useState<{ direction: SortDirection; key: SortKey } | null>(null);
  const loadedFichaListRef = useRef<string | null>(null);
  const hasItems = Boolean(result?.items.length);
  const organizingModelLabel = organizingModel ? findAiModelOption(organizingModel)?.label ?? organizingModel : null;
  const selectedFicha = linkedFichas.find((ficha) => ficha.id === selectedFichaId) ?? null;
  const fichaOptions = useMemo<CustomDatalistOption[]>(
    () =>
      linkedFichas.map((ficha) => ({
        aliases: [ficha.cliente, ficha.numeroVenda, ficha.dataEntrega, ficha.id].filter(Boolean) as string[],
        details: getFichaOptionDetails(ficha),
        label: getFichaOptionLabel(ficha),
        metadata: {
          id: ficha.id,
        },
        value: getFichaOptionLabel(ficha),
      })),
    [linkedFichas],
  );
  const sortedItems = useMemo(
    () => (result ? (sortConfig ? sortItems(result.items, sortConfig.key, sortConfig.direction) : result.items) : []),
    [result, sortConfig],
  );
  const displayedSortedItems = useMemo(
    () =>
      sortedItems.map((item) => ({
        ...item,
        nome: nameCaseMode === "original" ? item.nome : transformNameCase(item.nome, nameCaseMode),
      })),
    [nameCaseMode, sortedItems],
  );
  const selectedFichaHasLinkedList = Boolean(selectedFicha?.listaIaAnexada || selectedFicha?.listaIa);
  const hasDistinctGroups = useMemo(
    () => new Set((result?.items ?? []).map((item) => item.grupo?.trim() || "")).size > 1,
    [result],
  );
  const showGroupColumn = isEditingResult || hasDistinctGroups;
  const columns = useMemo(
    () =>
      DISPLAY_COLUMN_ORDER.filter((key) => key !== "grupo" || showGroupColumn).map((key) => ({
        key,
        label: COLUMN_META[key].label,
        align: COLUMN_META[key].align,
        onSort: () =>
          setSortConfig((current) => ({
            direction: current?.key === key && current.direction === "ascending" ? "descending" : "ascending",
            key,
          })),
        sortDirection: sortConfig?.key === key ? sortConfig.direction : undefined,
      })),
    [showGroupColumn, sortConfig],
  );

  function updateTextItem(rowId: string, field: EditableTextField, value: string) {
    setHasUnsavedChanges(true);
    setResult((current) =>
      current
        ? {
            items: current.items.map((item) => (item.rowId === rowId ? { ...item, [field]: value.trim() ? value : null } : item)),
          }
        : current,
    );
  }

  function setEditableResult(nextResult: EditableUniformList | null) {
    setNameCaseMode("original");
    setResult(nextResult);
  }

  function transformResultNames(mode: NameCaseMode) {
    setNameCaseMode(mode);
  }

  function updateModelItem(rowId: string, value: string) {
    if (!MODEL_OPTIONS.includes(value as (typeof MODEL_OPTIONS)[number])) return;

    setHasUnsavedChanges(true);
    setResult((current) =>
      current
        ? {
            items: current.items.map((item) =>
              item.rowId === rowId ? { ...item, modelo: value as UniformListItem["modelo"] } : item,
            ),
          }
        : current,
    );
  }

  function updateConfidenceItem(rowId: string, value: string) {
    if (!CONFIDENCE_OPTIONS.includes(value as (typeof CONFIDENCE_OPTIONS)[number])) return;

    setHasUnsavedChanges(true);
    setResult((current) =>
      current
        ? {
            items: current.items.map((item) =>
              item.rowId === rowId ? { ...item, confianca: value as UniformListItem["confianca"] } : item,
            ),
          }
        : current,
    );
  }

  async function saveListToFicha(list: EditableUniformList, options: { aiModel?: string | null; silent?: boolean } = {}) {
    if (!list.items.length || !selectedFichaId) return false;

    setIsSaving(true);

    try {
      const response = await fetch("/api/ai/uniform-list-ficha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiModel: options.aiModel ?? organizingModel,
          fichaId: selectedFichaId,
          list: stripEditableList(list),
          sourceText: text.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as LinkApiResponse | null;

      if (!response.ok || !payload?.success || !payload.ficha) {
        toast.error(payload && !payload.success ? payload.error : "Não foi possível salvar a lista.");
        return false;
      }

      const savedFicha = payload.ficha;
      setLinkedFichas((current) => current.map((ficha) => (ficha.id === savedFicha.id ? savedFicha : ficha)));
      setSelectedFichaId(savedFicha.id);
      setSelectedFichaLabel(getFichaOptionLabel(savedFicha));
      loadedFichaListRef.current = savedFicha.id;
      setHasUnsavedChanges(false);

      if (!options.silent) toast.success("Lista salva na ficha.");
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (result) await saveListToFicha(result);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setEditableResult(null);
    setHasUnsavedChanges(false);
    setOrganizingModel(null);
    setIsEditingResult(false);

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
        body: JSON.stringify({ text }),
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

      const organizedList = createEditableList(payload.data);
      setActiveCopyCell(null);
      setIsEditingResult(false);
      setOrganizingModel(payload.aiModel);
      setEditableResult(organizedList);
      setHasUnsavedChanges(true);

      if (selectedFichaId) {
        const saved = await saveListToFicha(organizedList, { aiModel: payload.aiModel, silent: true });
        if (saved) toast.success("Primeira versão salva na ficha.");
      }
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

  async function handleLoadFichas() {
    setIsLoadingLink(true);

    try {
      const query = selectedFichaLabel.trim();
      const response = await fetch(`/api/ai/uniform-list-ficha${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const payload = (await response.json().catch(() => null)) as LinkApiResponse | null;

      if (!response.ok || !payload?.success) {
        toast.error(payload && !payload.success ? payload.error : "Não foi possível carregar os pedidos.");
        return;
      }

      const fichas = payload.fichas ?? [];
      setLinkedFichas(fichas);

      if (fichas.length === 0) {
        setSelectedFichaId("");
        setSelectedFichaLabel("");
        toast.warning("Nenhum pedido encontrado.");
        return;
      }

      const nextFicha = fichas.find((ficha) => ficha.id === selectedFichaId) ?? fichas[0];
      setSelectedFichaId(nextFicha.id);
      setSelectedFichaLabel(getFichaOptionLabel(nextFicha));
      toast.success("Pedidos carregados.");
    } finally {
      setIsLoadingLink(false);
    }
  }

  // Carrega automaticamente a lista organizada (e a lista bruta) quando uma ficha
  // que já possui lista vinculada é selecionada, sem sobrescrever alterações não salvas.
  useEffect(() => {
    const ficha = linkedFichas.find((item) => item.id === selectedFichaId);
    if (!selectedFichaId || !ficha?.listaIaAnexada) return;
    if (loadedFichaListRef.current === selectedFichaId || hasUnsavedChanges) return;

    loadedFichaListRef.current = selectedFichaId;
    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/ai/uniform-list-ficha?fichaId=${encodeURIComponent(selectedFichaId)}`);
      const payload = (await response.json().catch(() => null)) as LinkApiResponse | null;
      if (cancelled || !response.ok || !payload?.success || !payload.ficha) return;

      const loadedFicha = payload.ficha;
      setLinkedFichas((current) => current.map((item) => (item.id === loadedFicha.id ? loadedFicha : item)));

      if (loadedFicha.listaIa) {
        setActiveCopyCell(null);
        setIsEditingResult(false);
        setEditableResult(createEditableList({ items: loadedFicha.listaIa.items }));
        setOrganizingModel(loadedFicha.listaIa.aiModel ?? null);
        setSortConfig(null);
        setHasUnsavedChanges(false);

        const sourceText = loadedFicha.listaIa.sourceText?.trim();
        if (sourceText) setText(sourceText);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedFichaId, linkedFichas, hasUnsavedChanges]);

  function handleExportCsv() {
    if (!result?.items.length) return;

    saveBlob(
      new Blob([buildUniformCorelCsv(displayedSortedItems)], {
        type: "text/csv;charset=utf-8",
      }),
      buildUniformCorelCsvFilename(selectedFicha?.cliente ?? "sem_ficha"),
    );
  }

  function handleExportByGroups() {
    if (!result?.items.length) return;

    const clienteNome = selectedFicha?.cliente ?? "sem_ficha";
    const groups = new Map<string, typeof displayedSortedItems>();
    displayedSortedItems.forEach((item) => {
      const group = item.grupo?.trim() || "Sem grupo";
      groups.set(group, [...(groups.get(group) ?? []), item]);
    });

    groups.forEach((items, group) => {
      saveBlob(
        new Blob([buildUniformCorelCsv(items)], {
          type: "text/csv;charset=utf-8",
        }),
        buildUniformCorelCsvFilename(clienteNome, group),
      );
    });
  }

  function handlePrint() {
    if (!result?.items.length) return;

    const opened = printUniformList({
      items: displayedSortedItems,
      label: organizingModelLabel ? `Organizado por ${organizingModelLabel}` : "Lista organizada",
      rawText: "",
      showGroup: hasDistinctGroups,
      title: selectedFicha?.cliente ? `Lista - ${selectedFicha.cliente}` : "Lista organizada",
      tipo: "organizada",
    });

    if (!opened) {
      toast.error("Nao foi possivel abrir a impressao", { description: "Tente novamente." });
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
            <div className="ai-demo__result-heading">
              <h2>Resultado</h2>
              <p>{hasItems ? `${result?.items.length} itens` : "Nenhum item"}</p>
              {organizingModelLabel ? <Badge tone="info">Organizado por {organizingModelLabel}</Badge> : null}
            </div>
            <div className="ai-demo__link">
              <label htmlFor={fichaInputId}>Ficha</label>
              <div className="ai-demo__link-row">
                <CustomDatalist
                  aria-label="Ficha vinculada"
                  id={fichaInputId}
                  onValueChange={(value, option) => {
                    setSelectedFichaLabel(value);
                    setSelectedFichaId(option?.metadata?.id ?? "");
                  }}
                  onEnterKey={() => {
                    void handleLoadFichas();
                  }}
                  options={fichaOptions}
                  placeholder="Cliente ou venda"
                  value={selectedFichaLabel}
                />
                <Button aria-disabled={isLoadingLink} disabled={isLoadingLink} onClick={handleLoadFichas} type="button" variant="secondary">
                  {isLoadingLink ? <span className="button-spinner" aria-hidden="true" /> : <Search aria-hidden="true" size={16} />}
                  Buscar
                </Button>
                <Button
                  aria-disabled={!hasItems || !selectedFicha || isSaving || !hasUnsavedChanges}
                  disabled={!hasItems || !selectedFicha || isSaving || !hasUnsavedChanges}
                  onClick={handleSave}
                  type="button"
                >
                  {isSaving ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={17} />}
                  {hasItems && !hasUnsavedChanges ? "Salvo" : "Salvar"}
                </Button>
              </div>
              {selectedFicha ? (
                <Badge tone={selectedFichaHasLinkedList ? "success" : "neutral"}>
                  {selectedFichaHasLinkedList ? "Lista organizada" : "Sem lista"}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="ai-demo__toolbar">
            <div className="ai-demo__toolbar-start">
              <div className="format-toolbar" role="group" aria-label="Formato dos nomes">
                {NAME_CASE_OPTIONS.map(({ icon: Icon, label: optionLabel, mode }) => (
                  <button
                    aria-label={optionLabel}
                    className={["format-toolbar__button", nameCaseMode === mode ? "is-active" : null].filter(Boolean).join(" ")}
                    data-active={nameCaseMode === mode ? "true" : undefined}
                    disabled={!hasItems || isEditingResult}
                    key={mode}
                    onClick={() => transformResultNames(mode)}
                    title={optionLabel}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={16} />
                  </button>
                ))}
              </div>
              <Button
                aria-disabled={!hasItems}
                disabled={!hasItems}
                onClick={() => setIsEditingResult((current) => !current)}
                type="button"
                variant="secondary"
              >
                {isEditingResult ? <Check aria-hidden="true" size={17} /> : <Pencil aria-hidden="true" size={17} />}
                {isEditingResult ? "Concluir" : "Editar"}
              </Button>
            </div>
            <div className="ai-demo__toolbar-end">
              <Button aria-disabled={!hasItems} disabled={!hasItems} onClick={handleExportCsv} type="button" variant="secondary">
                <FileSpreadsheet aria-hidden="true" size={17} />
                Exportar CSV
              </Button>
              {hasDistinctGroups ? (
                <Button aria-disabled={!hasItems} disabled={!hasItems} onClick={handleExportByGroups} type="button" variant="secondary">
                  <FileSpreadsheet aria-hidden="true" size={17} />
                  Exportar separado por grupo
                </Button>
              ) : null}
              <Button aria-disabled={!hasItems} disabled={!hasItems} onClick={handlePrint} type="button" variant="secondary">
                <Printer aria-hidden="true" size={17} />
                Imprimir
              </Button>
            </div>
          </div>

          {error ? (
            <p className="ai-demo__feedback ai-demo__feedback--error" role="alert">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <TableGenerationAnimation />
          ) : result ? (
            <DataTable caption="Lista organizada para revisão" columns={columns}>
              {(isEditingResult ? sortedItems : displayedSortedItems).map((item, index) => {
                if (isEditingResult) {
                  return (
                    <tr key={item.rowId}>
                      <td className="ui-table__primary">
                        <input
                          aria-label={`Nome ${index + 1}`}
                          className="ai-demo__cell-input"
                          onChange={(event) => updateTextItem(item.rowId, "nome", event.target.value)}
                          value={item.nome ?? ""}
                        />
                      </td>
                      <td className="ai-demo__cell--center">
                        <input
                          aria-label={`Número ${index + 1}`}
                          className="ai-demo__cell-input"
                          onChange={(event) => updateTextItem(item.rowId, "numero", event.target.value)}
                          value={item.numero ?? ""}
                        />
                      </td>
                      <td className="ai-demo__cell--center">
                        <input
                          aria-label={`Tamanho ${index + 1}`}
                          className="ai-demo__cell-input"
                          onChange={(event) => updateTextItem(item.rowId, "tamanho", event.target.value)}
                          value={item.tamanho ?? ""}
                        />
                      </td>
                      <td>
                        <select
                          aria-label={`Modelo ${index + 1}`}
                          className="ai-demo__cell-select"
                          onChange={(event) => updateModelItem(item.rowId, event.target.value)}
                          value={item.modelo}
                        >
                          {MODEL_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {formatModel(option)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="ai-demo__cell--center">
                        <select
                          aria-label={`Confiança ${index + 1}`}
                          className="ai-demo__cell-select"
                          onChange={(event) => updateConfidenceItem(item.rowId, event.target.value)}
                          value={item.confianca}
                        >
                          {CONFIDENCE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {formatConfidence(option)}
                            </option>
                          ))}
                        </select>
                      </td>
                      {showGroupColumn ? (
                        <td>
                          <input
                            aria-label={`Grupo ${index + 1}`}
                            className="ai-demo__cell-input"
                            onChange={(event) => updateTextItem(item.rowId, "grupo", event.target.value)}
                            value={item.grupo ?? ""}
                          />
                        </td>
                      ) : null}
                      <td>
                        <input
                          aria-label={`Observação ${index + 1}`}
                          className="ai-demo__cell-input"
                          onChange={(event) => updateTextItem(item.rowId, "observacao", event.target.value)}
                          value={item.observacao ?? ""}
                        />
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.rowId}>
                    <td className="ui-table__primary ai-demo__copy-td">
                      <CopyCell
                        isActive={activeCopyCell?.rowKey === item.rowId && activeCopyCell.field === "nome"}
                        label="Nome"
                        onActivate={() => setActiveCopyCell({ field: "nome", rowKey: item.rowId })}
                        value={item.nome}
                      />
                    </td>
                    <td className="ai-demo__copy-td ai-demo__cell--center">
                      <CopyCell
                        isActive={activeCopyCell?.rowKey === item.rowId && activeCopyCell.field === "numero"}
                        label="Número"
                        onActivate={() => setActiveCopyCell({ field: "numero", rowKey: item.rowId })}
                        value={item.numero}
                      />
                    </td>
                    <td className="ai-demo__cell--center">{displayValue(item.tamanho)}</td>
                    <td>{formatModel(item.modelo)}</td>
                    <td className="ai-demo__cell--center">
                      <ConfidenceDot value={item.confianca} />
                    </td>
                    {showGroupColumn ? <td>{displayValue(item.grupo)}</td> : null}
                    <td>{displayValue(item.observacao)}</td>
                  </tr>
                );
              })}
            </DataTable>
          ) : (
            <TableGenerationAnimation animated={false} />
          )}
        </div>
      </div>
    </section>
  );
}
