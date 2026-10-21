"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
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
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  CustomDatalist,
  DataTable,
  IconButton,
  Tooltip,
  type CustomDatalistHandle,
  type CustomDatalistOption,
} from "@/components/ui";
import { findAiModelOption } from "@/lib/ai/model-options";
import { buildUniformCorelCsv, buildUniformCorelCsvFilename } from "@/lib/ai/uniform-list-csv";
import { printUniformList } from "@/lib/ai/uniform-list-print";
import type { UniformList, UniformListItem } from "@/lib/ai/schemas/uniform-list";
import { formatShortDateInput } from "@/lib/dates";
import { transformNameCase, type NameCaseMode } from "@/lib/name-case";
import {
  FICHA_THUMB_HEIGHT,
  FICHA_THUMB_WIDTH,
  createEditableList,
  displayValue,
  formatConfidence,
  formatFichaItemsTotal,
  formatFichaVenda,
  formatModel,
  getFichaOptionDetails,
  getFichaOptionLabel,
  getFichaThumbUrl,
  saveBlob,
  sortItems,
  stripEditableList,
  type EditableTextField,
  type EditableUniformList,
  type LinkedFicha,
  type SortDirection,
  type SortKey,
} from "./uniform-list-parser-utils";

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

type ActiveCopyCell = {
  field: "nome" | "numero";
  rowKey: string;
};

type TextMatch = {
  end: number;
  start: number;
};

function findTextMatches(value: string, query: string, matchCase: boolean): TextMatch[] {
  if (!query) return [];

  const source = matchCase ? value : value.toLocaleLowerCase("pt-BR");
  const needle = matchCase ? query : query.toLocaleLowerCase("pt-BR");
  const matches: TextMatch[] = [];
  let start = 0;

  while (start <= source.length - needle.length) {
    const matchStart = source.indexOf(needle, start);
    if (matchStart < 0) break;
    matches.push({ start: matchStart, end: matchStart + query.length });
    start = matchStart + Math.max(query.length, 1);
  }

  return matches;
}

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
    <Tooltip label={`Confiança: ${label}`}>
      <span className={`confidence-dot confidence-dot--${value}`}>
        <span aria-hidden="true" className="confidence-dot__mark" />
        <span className="sr-only">{label}</span>
      </span>
    </Tooltip>
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
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replacementTerm, setReplacementTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const loadedFichaListRef = useRef<string | null>(null);
  const fichaDatalistRef = useRef<CustomDatalistHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasItems = Boolean(result?.items.length);
  const textMatches = useMemo(() => findTextMatches(text, searchTerm, matchCase), [matchCase, searchTerm, text]);
  const organizingModelLabel = organizingModel ? findAiModelOption(organizingModel)?.label ?? organizingModel : null;
  const selectedFicha = linkedFichas.find((ficha) => ficha.id === selectedFichaId) ?? null;
  const fichaOptions = useMemo<CustomDatalistOption[]>(
    () =>
      linkedFichas.map((ficha) => ({
        aliases: [ficha.cliente, ficha.numeroVenda, ficha.dataEntrega, ficha.id].filter(Boolean) as string[],
        details: getFichaOptionDetails(ficha),
        id: ficha.id,
        imageUrl: getFichaThumbUrl(ficha),
        label: getFichaOptionLabel(ficha),
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
  const selectedFichaThumbUrl = getFichaThumbUrl(selectedFicha);
  const selectedFichaSummary = selectedFicha
    ? [
        formatFichaVenda(selectedFicha.numeroVenda),
        `Entrega ${formatShortDateInput(selectedFicha.dataEntrega)}`,
        formatFichaItemsTotal(selectedFicha.itensTotal),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
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

  function selectTextMatch(match: TextMatch, index: number) {
    setActiveMatchIndex(index);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(match.start, match.end);
    });
  }

  function openReplacePanel() {
    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      const selection = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
      if (!selection.includes("\n")) setSearchTerm(selection);
    }

    setIsReplaceOpen(true);
    setActiveMatchIndex(-1);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }

  function closeReplacePanel() {
    setIsReplaceOpen(false);
    setActiveMatchIndex(-1);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleEditorShortcut(event: ReactKeyboardEvent<HTMLElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("pt-BR") === "h") {
      event.preventDefault();
      openReplacePanel();
    } else if (event.key === "Escape" && isReplaceOpen) {
      event.preventDefault();
      closeReplacePanel();
    }
  }

  function handleTextareaTab(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
    const selectedBlock = text.slice(lineStart, selectionEnd);
    const spansMultipleLines = selectedBlock.includes("\n");

    if (!event.shiftKey && !spansMultipleLines) {
      const nextText = `${text.slice(0, selectionStart)}\t${text.slice(selectionEnd)}`;
      if (nextText.length > MAX_TEXT_LENGTH) return;
      setText(nextText);
      setActiveMatchIndex(-1);
      requestAnimationFrame(() => textarea.setSelectionRange(selectionStart + 1, selectionStart + 1));
      return;
    }

    const lines = selectedBlock.split("\n");
    let removedBeforeSelection = 0;
    const changedLines = lines.map((line, index) => {
      if (!event.shiftKey) return `\t${line}`;
      if (line.startsWith("\t")) {
        if (index === 0) removedBeforeSelection = 1;
        return line.slice(1);
      }
      const spaces = line.match(/^ {1,4}/u)?.[0].length ?? 0;
      if (index === 0) removedBeforeSelection = spaces;
      return line.slice(spaces);
    });
    const replacement = changedLines.join("\n");
    const nextText = `${text.slice(0, lineStart)}${replacement}${text.slice(selectionEnd)}`;
    if (nextText.length > MAX_TEXT_LENGTH) return;

    setText(nextText);
    setActiveMatchIndex(-1);
    const nextStart = event.shiftKey
      ? Math.max(lineStart, selectionStart - removedBeforeSelection)
      : selectionStart + 1;
    const nextEnd = selectionEnd + (replacement.length - (selectionEnd - lineStart));
    requestAnimationFrame(() => textarea.setSelectionRange(nextStart, Math.max(nextStart, nextEnd)));
  }

  function moveToMatch(direction: 1 | -1) {
    if (!textMatches.length) return;

    const caret = textareaRef.current?.selectionStart ?? 0;
    let nextIndex: number;
    if (activeMatchIndex >= 0) {
      nextIndex = (activeMatchIndex + direction + textMatches.length) % textMatches.length;
    } else if (direction === 1) {
      nextIndex = textMatches.findIndex((match) => match.start >= caret);
      if (nextIndex < 0) nextIndex = 0;
    } else {
      nextIndex = textMatches.findLastIndex((match) => match.end <= caret);
      if (nextIndex < 0) nextIndex = textMatches.length - 1;
    }

    selectTextMatch(textMatches[nextIndex], nextIndex);
  }

  function replaceCurrentMatch() {
    if (!searchTerm || !textMatches.length) return;

    const caret = textareaRef.current?.selectionStart ?? 0;
    let targetIndex = activeMatchIndex;
    if (targetIndex < 0 || targetIndex >= textMatches.length) {
      targetIndex = textMatches.findIndex((match) => match.start >= caret);
      if (targetIndex < 0) targetIndex = 0;
    }

    const target = textMatches[targetIndex];
    const nextText = `${text.slice(0, target.start)}${replacementTerm}${text.slice(target.end)}`;
    if (nextText.length > MAX_TEXT_LENGTH) {
      toast.error("A substitui\u00e7\u00e3o ultrapassa o limite de 10000 caracteres.");
      return;
    }

    setText(nextText);
    const nextMatches = findTextMatches(nextText, searchTerm, matchCase);
    const nextCaret = target.start + replacementTerm.length;
    let nextIndex = nextMatches.findIndex((match) => match.start >= nextCaret);
    if (nextIndex < 0 && nextMatches.length) nextIndex = 0;

    if (nextIndex >= 0) {
      selectTextMatch(nextMatches[nextIndex], nextIndex);
    } else {
      setActiveMatchIndex(-1);
      requestAnimationFrame(() => textareaRef.current?.setSelectionRange(nextCaret, nextCaret));
    }
  }

  function replaceAllMatches() {
    if (!searchTerm || !textMatches.length) return;

    let cursor = 0;
    const parts: string[] = [];
    textMatches.forEach((match) => {
      parts.push(text.slice(cursor, match.start), replacementTerm);
      cursor = match.end;
    });
    parts.push(text.slice(cursor));
    const nextText = parts.join("");
    if (nextText.length > MAX_TEXT_LENGTH) {
      toast.error("A substitui\u00e7\u00e3o ultrapassa o limite de 10000 caracteres.");
      return;
    }

    setText(nextText);
    setActiveMatchIndex(-1);
    toast.success(
      textMatches.length === 1
        ? "1 ocorr\u00eancia substitu\u00edda."
        : `${textMatches.length} ocorr\u00eancias substitu\u00eddas.`,
    );
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

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

      // A busca nunca escolhe a ficha por conta propria. Selecionar a primeira
      // do resultado trocaria a ficha vinculada e recarregaria a lista salva
      // dela por cima do que esta na tela, sem o usuario ter pedido nada.
      if (!fichas.some((ficha) => ficha.id === selectedFichaId)) setSelectedFichaId("");

      if (fichas.length === 0) {
        toast.warning("Nenhum pedido encontrado.");
        return;
      }

      // O resultado so ajuda se estiver visivel: devolve o foco ao campo e
      // reabre a lista, em vez de exigir um segundo clique.
      fichaDatalistRef.current?.focusAndOpen();
      toast.success(fichas.length === 1 ? "1 pedido encontrado." : `${fichas.length} pedidos encontrados.`);
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
      toast.error("Não foi possível abrir a impressão", { description: "Tente novamente." });
    }
  }

  return (
    <section className="ai-demo" aria-labelledby={`${textareaId}-title`}>
      <h1 className="sr-only" id={`${textareaId}-title`}>
        Organizar nomes com IA
      </h1>
      <div className="ai-demo__workspace">
        <form className="ai-demo__form" onSubmit={handleSubmit}>
          <div className="ai-demo__header">
            <div>
              <h2>Organizar lista</h2>
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
            <div className="ai-demo__editor" onKeyDown={handleEditorShortcut}>
              {isReplaceOpen ? (
                <div aria-label="Localizar e substituir" className="ai-demo__replace" role="search">
                  <div className="ai-demo__replace-row">
                    <label className="ai-demo__replace-field">
                      <span className="sr-only">Localizar</span>
                      <Search aria-hidden="true" size={16} />
                      <input
                        aria-label="Localizar"
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          setActiveMatchIndex(-1);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          moveToMatch(event.shiftKey ? -1 : 1);
                        }}
                        placeholder="Localizar"
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                      />
                      <span aria-live="polite" className="ai-demo__replace-count">
                        {searchTerm ? (textMatches.length ? `${Math.max(activeMatchIndex + 1, 1)}/${textMatches.length}` : "0/0") : ""}
                      </span>
                    </label>
                    <button
                      aria-label={"Ocorr\u00eancia anterior"}
                      className="ai-demo__replace-icon"
                      disabled={!textMatches.length}
                      onClick={() => moveToMatch(-1)}
                      type="button"
                    >
                      <ArrowUp aria-hidden="true" size={17} />
                    </button>
                    <button
                      aria-label={"Pr\u00f3xima ocorr\u00eancia"}
                      className="ai-demo__replace-icon"
                      disabled={!textMatches.length}
                      onClick={() => moveToMatch(1)}
                      type="button"
                    >
                      <ArrowDown aria-hidden="true" size={17} />
                    </button>
                    <button
                      aria-label={"Diferenciar mai\u00fasculas de min\u00fasculas"}
                      aria-pressed={matchCase}
                      className="ai-demo__replace-icon"
                      onClick={() => {
                        setMatchCase((current) => !current);
                        setActiveMatchIndex(-1);
                      }}
                      type="button"
                    >
                      <CaseSensitive aria-hidden="true" size={18} />
                    </button>
                    <button aria-label="Fechar localizar e substituir" className="ai-demo__replace-icon" onClick={closeReplacePanel} type="button">
                      <X aria-hidden="true" size={18} />
                    </button>
                  </div>
                  <div className="ai-demo__replace-row ai-demo__replace-row--actions">
                    <label className="ai-demo__replace-field">
                      <span className="sr-only">Substituir por</span>
                      <input
                        aria-label="Substituir por"
                        onChange={(event) => setReplacementTerm(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          replaceCurrentMatch();
                        }}
                        placeholder="Substituir por"
                        type="text"
                        value={replacementTerm}
                      />
                    </label>
                    <button className="ai-demo__replace-button" disabled={!textMatches.length} onClick={replaceCurrentMatch} type="button">
                      Substituir
                    </button>
                    <button className="ai-demo__replace-button" disabled={!textMatches.length} onClick={replaceAllMatches} type="button">
                      Substituir tudo
                    </button>
                  </div>
                </div>
              ) : null}
              <textarea
                aria-keyshortcuts="Control+H"
                id={textareaId}
                maxLength={MAX_TEXT_LENGTH}
                onChange={(event) => {
                  setText(event.target.value);
                  setActiveMatchIndex(-1);
                }}
                onKeyDown={handleTextareaTab}
                placeholder="Cole a lista aqui..."
                ref={textareaRef}
                rows={18}
                value={text}
              />
            </div>
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
                    setSelectedFichaId(option?.id ?? "");
                  }}
                  onEnterKey={() => {
                    void handleLoadFichas();
                  }}
                  options={fichaOptions}
                  placeholder="Cliente ou venda"
                  ref={fichaDatalistRef}
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
                <div className="ai-demo__link-selected">
                  {selectedFichaThumbUrl ? (
                    <Image
                      alt=""
                      className="ai-demo__link-thumb"
                      height={FICHA_THUMB_HEIGHT}
                      src={selectedFichaThumbUrl}
                      unoptimized
                      width={FICHA_THUMB_WIDTH}
                    />
                  ) : null}
                  <span className="ai-demo__link-selected-text">
                    <strong>{selectedFicha.cliente}</strong>
                    <small>{selectedFichaSummary}</small>
                  </span>
                  <Badge tone={selectedFichaHasLinkedList ? "success" : "neutral"}>
                    {selectedFichaHasLinkedList ? "Lista organizada" : "Sem lista"}
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>

          <div className="ai-demo__toolbar">
            <div className="ai-demo__toolbar-start">
              <div className="format-toolbar" role="group" aria-label="Formato dos nomes">
                {NAME_CASE_OPTIONS.map(({ icon: Icon, label: optionLabel, mode }) => (
                  <IconButton
                    appearance="bare"
                    className={["format-toolbar__button", nameCaseMode === mode ? "is-active" : null].filter(Boolean).join(" ")}
                    data-active={nameCaseMode === mode ? "true" : undefined}
                    disabled={!hasItems || isEditingResult}
                    key={mode}
                    label={optionLabel}
                    onClick={() => transformResultNames(mode)}
                  >
                    <Icon aria-hidden="true" size={16} />
                  </IconButton>
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
