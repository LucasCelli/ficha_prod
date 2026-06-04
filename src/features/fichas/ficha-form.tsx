"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal, flushSync, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useDragAndDrop } from "fluid-dnd/react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { normalizeNameOrCompany } from "@/lib/name-normalizer";
import {
  Bold,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Cog,
  GripVertical,
  Images,
  Italic,
  List,
  ListOrdered,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  PackageOpen,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  Underline,
  Upload,
  UserRound,
  Wand2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  Button,
  CustomDatalist,
  Modal,
  Tooltip,
  type CustomDatalistOption,
} from "@/components/ui";
import type { CatalogOptionsByKind } from "@/features/catalogos/data";
import {
  addDaysToInput,
  createUtcDateFromInput,
  formatDateInput,
  formatLocalDateInput,
  getBusinessTodayInput,
  getDateInputDifferenceInDays,
  parseDateInputToLocalDate,
} from "@/lib/dates";
import { useFluidDndEventTargetGuard } from "@/lib/fluid-dnd-event-target-guard";
import { createFichaAction, updateFichaAction } from "./actions";
import type { FichaDetail } from "./data";
import { clearCreateFichaDraftSnapshot, CREATE_FICHA_DRAFT_STORAGE_KEY } from "./ficha-draft-storage";
import type { FichaFormClientValues, FichaFormInitialData, ImageFormItem, ProductFormItem } from "./ficha-form-seed";
import { createEmptyFichaFormInitialData, createEmptyProductItem, mapFichaToInitialData } from "./ficha-form-seed";
import { getInitialFichaFormState } from "./form-state";
import type { LegacyFichaImportWarning } from "./legacy-import";
import { mapLegacyDraftToFichaFormInitialData, parseLegacyFichaJson } from "./legacy-import";
import { buildObservacoesTecnicas, uppercaseObservationHtml } from "./observacoes-autofill";
import { PrintFicha } from "./print-ficha";
import { PrintTriggerButton } from "./print-trigger-button";

type FichaFormProps = {
  canImportLegacyJson?: boolean;
  catalogOptions?: CatalogOptionsByKind;
  clienteOptions?: CustomDatalistOption[];
  ficha?: FichaDetail;
  initialData?: FichaFormInitialData;
  mode?: "create" | "edit";
  vendedorOptions?: CustomDatalistOption[];
};

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

type RichTextCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "removeFormat";
type ClearableProductField = "quantidade" | "tamanho";

type FichaDraftSnapshot = {
  initialData: FichaFormInitialData;
  savedAt: string;
  version: 1;
};

const CREATE_FICHA_DRAFT_TOAST_ID = "ficha-create-draft-restore";

const MATERIAL_OPTIONS = [
  { composicao: "65% Poliéster / 35% Viscose", nome: "Malha Fria (PV)" },
  { composicao: "100% Poliéster", nome: "Dry Fit" },
];

const FALLBACK_CATALOG_OPTIONS: CatalogOptionsByKind = {
  acabamento_gola: ["Ribana", "Viés", "Viés Sublimado", "Ribana Sublimada", "Ribana em Molde"].map(createOption),
  acabamento_manga: ["Barra", "Punho", "Punho de Ribana", "Punho Sublimado", "Viés", "Viés Sublimado"].map(createOption),
  bolso: [
    "Sem bolso",
    "Bolso no Peito",
    "2 Bolsos na Frente",
    "2 Bolsos Traseiros",
    "1 Bolso Traseiro",
    "2 Bolsos na Frente e 2 Atrás",
    "2 Bolsos na Frente e 1 Atrás",
    "Bolsos na Frente Embutidos",
    "Bolsos na Frente Externos",
  ].map(createOption),
  cor: ["Branco", "Preto", "Azul Marinho", "Azul Royal", "Vermelho", "Verde", "Cinza", "Amarelo"].map(createOption),
  gola: ["Gola Redonda", "Gola V", "Gola Polo", "Gola Social", "Gola Padre com Zíper", "Gola Padre Esportiva", "Gola V Polo", "Gola Canoa"].map(createOption),
  manga: ["Curta", "Longa", "Curta e Longa", "Raglan Curta", "Raglan Longa", "3/4"].map(createOption),
  produto: [],
  tamanho: ["PP", "P", "M", "G", "GG", "XG", "XGG", "EXG"].map(createOption),
  tecido: MATERIAL_OPTIONS.map((option) => ({
    details: [option.composicao],
    label: option.nome,
    metadata: {
      composition: option.composicao,
    },
    value: option.nome,
  })),
};

const HELANCA_PRODUCT = normalizeProductForRule("Calça de Helanca");
const BRIM_PRODUCTS = new Set(["Calça de Brim", "Jaleco de Brim"].map(normalizeProductForRule));

function createOption(label: string): CustomDatalistOption {
  return {
    label,
    value: label,
  };
}

function getOptions(
  catalogOptions: CatalogOptionsByKind | undefined,
  kind: keyof CatalogOptionsByKind,
): CustomDatalistOption[] {
  if (catalogOptions) return catalogOptions[kind] ?? [];
  return FALLBACK_CATALOG_OPTIONS[kind];
}

function findOptionByName(options: CustomDatalistOption[], name: string): CustomDatalistOption | undefined {
  const normalizedName = normalizeProductForRule(name);
  return options.find((option) => normalizeProductForRule(option.value ?? option.label) === normalizedName)
    ?? options.find((option) => normalizeProductForRule(option.label).includes(normalizedName));
}

function getInitialProductItems(initialData: FichaFormInitialData): ProductFormItem[] {
  if (!initialData.itens.length) return [createEmptyProductItem()];
  return initialData.itens;
}

function getInitialImageItems(initialData: FichaFormInitialData): ImageFormItem[] {
  return initialData.imagens;
}

function getCloudinaryImagePath(publicId: string) {
  return publicId.split("/").map(encodeURIComponent).join("/");
}

function normalizeProductForRule(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getSizeSortParts(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const explicitOrder = SIZE_ORDER.get(normalized);
  const numericSize = /^\d+$/.test(normalized) ? Number(normalized) : null;

  if (explicitOrder !== undefined) {
    return {
      order: explicitOrder,
      section: 0,
      text: normalized,
    };
  }

  if (numericSize !== null) {
    return {
      order: numericSize,
      section: 1,
      text: normalized,
    };
  }

  return {
    order: 999,
    section: 2,
    text: normalized,
  };
}

function compareProductSize(a: string, b: string) {
  const left = getSizeSortParts(a);
  const right = getSizeSortParts(b);

  if (left.section !== right.section) return left.section - right.section;
  if (left.order !== right.order) return left.order - right.order;
  return left.text.localeCompare(right.text, "pt-BR", { sensitivity: "base" });
}

function normalizeProductSize(value: string) {
  return value.toLocaleUpperCase("pt-BR");
}

function isBabyLookProduct(value: string) {
  const normalized = normalizeProductForRule(value).replace(/[\s_-]+/g, "");
  return normalized.includes("babylook");
}

function getImageCardWidthFromGrid(gridWidth: number, count: number) {
  const gap = 14;
  if (count <= 1) return Math.max(240, Math.floor((gridWidth - gap) / 2));
  if (count === 2) return Math.max(220, Math.floor((gridWidth - gap) / 2));
  if (count === 3) return Math.max(200, Math.floor((gridWidth - gap * 2) / 3));
  return Math.max(180, Math.floor((gridWidth - gap * 3) / 4));
}

function parseDateValue(value?: string | null) {
  return parseDateInputToLocalDate(value);
}

function formatDateValue(date?: Date) {
  return formatLocalDateInput(date);
}

function formatDateLabel(value: string) {
  if (!parseDateValue(value)) return "Selecionar data";
  return formatDateInput(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPlainTextFromHtml(value: string) {
  if (!value.trim()) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizeObservationComparison(value: string) {
  return getPlainTextFromHtml(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toObservationHtml(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim().toLocaleUpperCase("pt-BR");
  return normalized ? `<p>${escapeHtml(normalized)}</p>` : "";
}

function stripTrailingPunctuation(value: string) {
  return value.trim().replace(/[.;,\s]+$/g, "");
}

function appendManualObservationText(generatedText: string, manualText: string) {
  const generated = stripTrailingPunctuation(generatedText);
  const manual = manualText.trim().toLocaleUpperCase("pt-BR");

  if (!manual) return generatedText;
  if (!generated) return manual;
  return `${generated} / ${manual}`;
}

function getManualObservationSuffix(currentHtml: string, lastAutoHtml: string) {
  const currentText = getPlainTextFromHtml(currentHtml).replace(/\s+/g, " ").trim();
  const lastAutoText = getPlainTextFromHtml(lastAutoHtml).replace(/\s+/g, " ").trim();

  if (!currentText || !lastAutoText) return "";
  if (currentText === lastAutoText) return "";
  if (!currentText.toLowerCase().startsWith(lastAutoText.toLowerCase())) return "";
  return currentText.slice(lastAutoText.length).replace(/^[\s.;:,-]+/, "").trim();
}

function getFormText(form: HTMLFormElement | null, field: string) {
  if (!form) return "";
  return String(new FormData(form).get(field) ?? "").trim();
}

function getControlLabel(form: HTMLFormElement | null, field: string) {
  const control = form?.elements.namedItem(field);

  if (control instanceof HTMLSelectElement) {
    const option = control.options[control.selectedIndex];
    const rawValue = option?.value ?? "";
    if (!option || ["", "0", "-", "nao", "nenhum"].includes(rawValue)) return "";
    return option.text.trim();
  }

  return getFormText(form, field);
}

function isRegataProduct(value: string) {
  const product = normalizeProductForRule(value);
  return product.includes("regata") || product.includes("colete");
}

function shouldLetServerValidateBeforeUpload(formData: FormData) {
  const requiredTextFields = ["cliente", "dataEntrega", "vendedor"];
  const hasMissingText = requiredTextFields.some((field) => !String(formData.get(field) ?? "").trim());

  if (hasMissingText) return true;

  try {
    const itens = JSON.parse(String(formData.get("itensJson") ?? "[]")) as Array<{ produto?: string }>;
    return !itens.some((item) => item.produto?.trim());
  } catch {
    return true;
  }
}

function serializeImageItems(images: ImageFormItem[]) {
  return JSON.stringify(
    images
      .filter((image) => image.publicId && image.secureUrl)
      .map((image) => ({
        altText: image.altText.trim(),
        bytes: image.bytes,
        height: image.height,
        publicId: image.publicId,
        secureUrl: image.secureUrl,
        width: image.width,
      })),
  );
}

function readFichaDraftSnapshot() {
  try {
    const rawValue = window.localStorage.getItem(CREATE_FICHA_DRAFT_STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<FichaDraftSnapshot>;
    if (parsed.version !== 1 || !parsed.initialData) return null;

    return {
      initialData: normalizeFichaDraftInitialData(parsed.initialData),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      version: 1,
    } satisfies FichaDraftSnapshot;
  } catch {
    return null;
  }
}

function writeFichaDraftSnapshot(snapshot: FichaDraftSnapshot) {
  try {
    window.localStorage.setItem(CREATE_FICHA_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    toast.warning("Rascunho local indisponível", {
      description: "Não foi possível salvar uma cópia local desta ficha.",
      id: "ficha-draft-storage-error",
    });
  }
}

function buildFichaDraftSnapshot(
  form: HTMLFormElement,
  values: FichaFormClientValues,
  imageItems: ImageFormItem[],
): FichaDraftSnapshot {
  const formData = new FormData(form);

  return {
    initialData: {
      ...createEmptyFichaFormInitialData(),
      acabamentoGola: values.acabamentoGola,
      acabamentoManga: values.acabamentoManga,
      aberturaLateral: values.aberturaLateral,
      arte: values.arte,
      bolso: formText(formData, "bolso"),
      cliente: formText(formData, "cliente"),
      clienteAuxiliar: formText(formData, "clienteAuxiliar"),
      comNomes: values.comNomes,
      composicao: values.composicao,
      etiqueta: formText(formData, "etiqueta"),
      corAberturaLateral: formText(formData, "corAberturaLateral"),
      corAcabamentoManga: formText(formData, "corAcabamentoManga"),
      corBotao: formText(formData, "corBotao"),
      corDetalheGola: formText(formData, "corDetalheGola"),
      corGola: formText(formData, "corGola"),
      corMaterial: formText(formData, "corMaterial"),
      corPeDeGolaExterno: formText(formData, "corPeDeGolaExterno"),
      corPeDeGolaInterno: formText(formData, "corPeDeGolaInterno"),
      corPeitilhoExterno: formText(formData, "corPeitilhoExterno"),
      corPeitilhoInterno: formText(formData, "corPeitilhoInterno"),
      corReforco: formText(formData, "corReforco"),
      corSublimacao: formText(formData, "corSublimacao"),
      dataEntrega: formText(formData, "dataEntrega"),
      dataInicio: formText(formData, "dataInicio"),
      evento: Boolean(formData.get("evento")),
      faixa: values.faixa,
      faixaCor: formText(formData, "faixaCor"),
      faixaLocal: formText(formData, "faixaLocal"),
      filete: values.filete,
      fileteCor: formText(formData, "fileteCor"),
      fileteLocal: formText(formData, "fileteLocal"),
      gola: values.gola,
      imagens: getSerializableImageItems(imageItems),
      itens: normalizeProductItems(values.itens),
      larguraGola: formText(formData, "larguraGola"),
      larguraManga: formText(formData, "larguraManga"),
      listaNomesRaw: values.listaNomesRaw,
      manga: formText(formData, "manga"),
      material: values.material,
      numeroVenda: formText(formData, "numeroVenda"),
      observacoes: values.observacoes,
      reforcoGola: values.reforcoGola,
      vendedor: formText(formData, "vendedor"),
    },
    savedAt: new Date().toISOString(),
    version: 1,
  };
}

function formText(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function normalizeProductItems(items: ProductFormItem[]) {
  const normalizedItems = items.map((item, index) => ({
    detalhesProduto: item.detalhesProduto,
    id: item.id || `item-${index}`,
    produto: item.produto,
    quantidade: item.quantidade || "1",
    tamanho: item.tamanho,
  }));

  return normalizedItems.length ? normalizedItems : [createEmptyProductItem()];
}

function getSerializableImageItems(images: ImageFormItem[]) {
  return images
    .filter((image) => image.publicId && image.secureUrl)
    .map((image) => ({
      altText: image.altText,
      bytes: image.bytes,
      height: image.height,
      id: image.publicId ?? image.id,
      publicId: image.publicId,
      secureUrl: image.secureUrl,
      width: image.width,
    }));
}

function normalizeFichaDraftInitialData(value: FichaFormInitialData) {
  return {
    ...createEmptyFichaFormInitialData(),
    ...value,
    imagens: getSerializableImageItems(Array.isArray(value.imagens) ? value.imagens : []),
    itens: normalizeProductItems(Array.isArray(value.itens) ? value.itens : []),
  };
}

function getComparableFichaDraft(initialData: FichaFormInitialData) {
  const comparableData = normalizeFichaDraftInitialData(initialData);
  return JSON.stringify({
    ...comparableData,
    imagens: comparableData.imagens.map(({ altText, bytes, height, publicId, secureUrl, width }) => ({
      altText,
      bytes,
      height,
      publicId,
      secureUrl,
      width,
    })),
    itens: comparableData.itens.map(({ detalhesProduto, produto, quantidade, tamanho }) => ({
      detalhesProduto,
      produto,
      quantidade,
      tamanho,
    })),
  });
}

function hasMeaningfulFichaDraft(initialData: FichaFormInitialData) {
  const emptyDraft = getComparableFichaDraft(createEmptyFichaFormInitialData());
  return getComparableFichaDraft(initialData) !== emptyDraft;
}

function haveSameItemOrder(left: Array<{ id: string }>, right: Array<{ id: string }>) {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id);
}

function hasUniqueItemIds(items: Array<{ id: string }>) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

type ImportedLegacyState = {
  fileName: string;
  importedAt: number;
  initialData: FichaFormInitialData;
  warnings: LegacyFichaImportWarning[];
};

type PendingLegacyImport = ImportedLegacyState;

export function FichaForm(props: FichaFormProps) {
  useFluidDndEventTargetGuard();

  const { ficha, initialData, mode = "create" } = props;
  const [importedLegacyState, setImportedLegacyState] = useState<ImportedLegacyState | null>(null);
  const [restoredDraftData, setRestoredDraftData] = useState<FichaFormInitialData | null>(null);
  const effectiveInitialData = restoredDraftData ?? initialData;
  const renderKey = `${mode}-${ficha?.id ?? effectiveInitialData?.cliente ?? "new"}-${importedLegacyState?.importedAt ?? 0}`;

  useEffect(() => {
    if (mode !== "create" || initialData || restoredDraftData) return;

    const snapshot = readFichaDraftSnapshot();
    if (!snapshot) return;

    toast.warning("Rascunho local encontrado", {
      action: {
        label: "Restaurar",
        onClick: () => {
          setRestoredDraftData(snapshot.initialData);
          toast.dismiss(CREATE_FICHA_DRAFT_TOAST_ID);
        },
      },
      cancel: (
        <button
          data-button=""
          data-cancel=""
          onClick={() => {
            clearCreateFichaDraftSnapshot();
            toast.dismiss(CREATE_FICHA_DRAFT_TOAST_ID);
          }}
          type="button"
        >
          Descartar
        </button>
      ),
      closeButton: false,
      className: "ficha-draft-toast",
      description: "Escolha se deseja continuar a ficha salva neste navegador.",
      dismissible: false,
      duration: Infinity,
      id: CREATE_FICHA_DRAFT_TOAST_ID,
    });

    return () => {
      toast.dismiss(CREATE_FICHA_DRAFT_TOAST_ID);
    };
  }, [initialData, mode, restoredDraftData]);

  useEffect(() => {
    if (!restoredDraftData) return;

    window.setTimeout(() => {
      toast.success("Rascunho restaurado", {
        description: "Os dados locais foram carregados.",
      });
    }, 0);
  }, [restoredDraftData]);

  return (
    <FichaFormInner
      key={renderKey}
      {...props}
      initialData={effectiveInitialData}
      importedLegacyState={importedLegacyState}
      onApplyImportedLegacyState={setImportedLegacyState}
    />
  );
}

type FichaFormInnerProps = FichaFormProps & {
  importedLegacyState: ImportedLegacyState | null;
  onApplyImportedLegacyState: (state: ImportedLegacyState) => void;
};

function FichaFormInner({
  canImportLegacyJson = false,
  catalogOptions,
  clienteOptions = [],
  ficha,
  initialData: seededInitialData,
  importedLegacyState,
  mode = "create",
  onApplyImportedLegacyState,
  vendedorOptions = [],
}: FichaFormInnerProps) {
  const router = useRouter();
  const initialData = useMemo(
    () => importedLegacyState?.initialData ?? seededInitialData ?? mapFichaToInitialData(ficha),
    [ficha, importedLegacyState, seededInitialData],
  );
  const action = mode === "edit" ? updateFichaAction : createFichaAction;
  const [state, formAction] = useActionState(action, getInitialFichaFormState());
  const formRef = useRef<HTMLFormElement>(null);
  const legacyImportInputRef = useRef<HTMLInputElement>(null);
  const imagensJsonInputRef = useRef<HTMLInputElement>(null);
  const imagensRef = useRef<ImageFormItem[]>([]);
  const lastToastMessageRef = useRef<string | null>(null);
  const lastImportedLegacyToastRef = useRef<number | null>(null);
  const lastObservacoesAutofillRef = useRef("");
  const draftAutosaveTimerRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);
  const initialDraftComparableRef = useRef<string | null>(null);
  const observacoesAutoBlockedRef = useRef(Boolean(initialData.observacoes.trim()));
  const applyingObservacoesAutoRef = useRef(false);
  const applyingObservacoesAutoTimerRef = useRef<number | null>(null);
  const [pendingLegacyImport, setPendingLegacyImport] = useState<PendingLegacyImport | null>(null);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const submitAfterUploadRef = useRef(false);
  const sortFeedbackTimerRef = useRef<number | null>(null);
  const clearedProductFieldsRef = useRef(new Map<string, { edited: boolean; value: string }>());
  const autoGolaRef = useRef(false);
  const autoMaterialRef = useRef(false);
  const autoComposicaoRef = useRef(false);
  const fichaForm = useForm<FichaFormClientValues>({
    defaultValues: {
      acabamentoGola: initialData.acabamentoGola,
      acabamentoManga: initialData.acabamentoManga,
      aberturaLateral: initialData.aberturaLateral,
      arte: initialData.arte,
      comNomes: initialData.comNomes,
      composicao: initialData.composicao,
      faixa: initialData.faixa,
      filete: initialData.filete,
      gola: initialData.gola,
      imagens: getInitialImageItems(initialData),
      itens: getInitialProductItems(initialData),
      material: initialData.material,
      listaNomesRaw: initialData.listaNomesRaw,
      observacoes: initialData.observacoes,
      reforcoGola: initialData.reforcoGola,
      viesRegata: initialData.acabamentoManga === "vies" ? "sim" : "",
    },
  });
  const { control, getValues, setValue } = fichaForm;
  const {
    append: appendProductItem,
    replace: replaceProductItems,
    remove: removeProductItemAt,
  } = useFieldArray({
    control,
    keyName: "fieldId",
    name: "itens",
  });
  const {
    append: appendImageItem,
    remove: removeImageItemAt,
    replace: replaceImageItems,
    update: updateImageItem,
  } = useFieldArray({
    control,
    keyName: "fieldId",
    name: "imagens",
  });
  const [gola, material, composicao, acabamentoGola, acabamentoManga, reforcoGola, aberturaLateral, filete, faixa, viesRegata, arte, comNomes, listaNomesRaw, observacoes, itens, imagens] =
    useWatch({
      control,
      name: [
        "gola",
        "material",
        "composicao",
        "acabamentoGola",
        "acabamentoManga",
        "reforcoGola",
        "aberturaLateral",
        "filete",
        "faixa",
        "viesRegata",
        "arte",
        "comNomes",
        "listaNomesRaw",
        "observacoes",
        "itens",
        "imagens",
      ],
    });
  const [imageGridWidth, setImageGridWidth] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [draftPrintFicha, setDraftPrintFicha] = useState<FichaDetail | null>(null);
  const [listaNomesModalOpen, setListaNomesModalOpen] = useState(false);
  const [listaNomesDraft, setListaNomesDraft] = useState(initialData.listaNomesRaw);
  const [observacoesConfirmationValue, setObservacoesConfirmationValue] = useState<string | null>(null);
  const [sortFeedbackVisible, setSortFeedbackVisible] = useState(false);
  const observacoesEditor = useEditor({
    content: observacoes || "",
    editorProps: {
      attributes: {
        "aria-describedby": state.fieldErrors?.observacoes ? "observacoes-error" : "",
        "aria-invalid": String(Boolean(state.fieldErrors?.observacoes)),
        "aria-label": "Observações",
        class: "rich-editor__surface",
        id: "observacoes",
        lang: "pt-BR",
      },
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        underline: false,
      }),
      UnderlineExtension,
    ],
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const rawHtml = editor.isEmpty ? "" : editor.getHTML();
      const nextHtml = uppercaseObservationHtml(rawHtml);
      const nextText = normalizeObservationComparison(nextHtml);
      const lastText = normalizeObservationComparison(lastObservacoesAutofillRef.current);

      if (rawHtml !== nextHtml) {
        editor.commands.setContent(nextHtml, { emitUpdate: false });
      }

      if (!applyingObservacoesAutoRef.current && nextText && nextText !== lastText) {
        observacoesAutoBlockedRef.current = true;
      }

      setValue("observacoes", nextHtml, { shouldDirty: true });
      scheduleDraftSnapshotPersist();
    },
  });
  const productOptions = getOptions(catalogOptions, "produto");
  const sizeOptions = getOptions(catalogOptions, "tamanho");
  const materialOptions = getOptions(catalogOptions, "tecido");
  const colorOptions = getOptions(catalogOptions, "cor");
  const mangaOptions = getOptions(catalogOptions, "manga");
  const acabamentoMangaOptions = getOptions(catalogOptions, "acabamento_manga");
  const golaOptions = getOptions(catalogOptions, "gola");
  const acabamentoGolaOptions = getOptions(catalogOptions, "acabamento_gola");
  const bolsoOptions = getOptions(catalogOptions, "bolso");
  const produtosPreenchidos = itens.map((item) => item.produto.trim()).filter(Boolean);
  const isRegataMode = produtosPreenchidos.length > 0 && produtosPreenchidos.every(isRegataProduct);
  const normalizedGola = normalizeProductForRule(gola);
  const normalizedAcabamentoManga = normalizeProductForRule(acabamentoManga);
  const isPolo = normalizedGola.includes("polo");
  const isSocial = normalizedGola.includes("social");
  const isPadreEsportiva = normalizedGola.includes("padre") && normalizedGola.includes("esportiva");
  const temGola = Boolean(gola);
  const acabamentoMangaValue = isRegataMode ? (viesRegata === "sim" ? "vies" : "") : acabamentoManga;
  const showMangaExtras = isRegataMode
    ? viesRegata === "sim"
    : ["punho", "vies", "ribana", "sublimado"].some((value) => normalizedAcabamentoManga.includes(value));
  const showLarguraGola = !isPolo && !isSocial && Boolean(acabamentoGola);
  const showCorReforco = !isSocial && reforcoGola === "sim";
  const showCorAbertura = isPolo && aberturaLateral === "sim";
  const showCorSublimacao = arte === "sublimacao";
  const primeiroProduto = itens.find((item) => item.produto.trim())?.produto ?? "";
  const productTotal = useMemo(() => sumProductQuantities(itens), [itens]);
  const hasListaNomesRaw = Boolean(listaNomesRaw?.trim());
  const [includeRawNameListOnPrint, setIncludeRawNameListOnPrint] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(initialData.dataEntrega);
  const ETIQUETA_FIXAS = ["Priscila Malhas", "EDSS"] as const;
  const [etiquetaSelecao, setEtiquetaSelecao] = useState<string>(() => {
    const e = initialData.etiqueta;
    if (!e) return "Priscila Malhas";
    if (ETIQUETA_FIXAS.includes(e as typeof ETIQUETA_FIXAS[number])) return e;
    return "Outra";
  });
  const [etiquetaOutra, setEtiquetaOutra] = useState<string>(() => {
    const e = initialData.etiqueta;
    if (!e || ETIQUETA_FIXAS.includes(e as typeof ETIQUETA_FIXAS[number])) return "";
    return e;
  });
  const etiquetaValue = etiquetaSelecao === "Outra" ? etiquetaOutra : etiquetaSelecao;
  const printFichaHref =
    mode === "edit" && ficha?.id
      ? `/fichas/${ficha.id}/imprimir${includeRawNameListOnPrint && hasListaNomesRaw ? "?listaNomesRaw=1" : ""}`
      : "";
  const productDragConfig = useMemo(() => ({
    animationDuration: 90,
    delayBeforeInsert: 0,
    delayBeforeRemove: 0,
    draggingClass: "products-editor__row--dragging",
    handlerSelector: ".products-editor__drag",
    isDraggable: (element: HTMLElement) => element.classList.contains("products-editor__row"),
  }), []);
  const imageDragConfig = useMemo(() => ({
    animationDuration: 90,
    delayBeforeInsert: 0,
    delayBeforeRemove: 0,
    direction: "horizontal" as const,
    draggingClass: "image-upload-card--dragging",
    handlerSelector: ".image-upload-card__order",
    isDraggable: (element: HTMLElement) => element.classList.contains("image-upload-card"),
  }), []);
  const [productsListRef, fluidProductItems, setFluidProductItems] = useDragAndDrop<ProductFormItem, HTMLDivElement>(
    itens,
    productDragConfig,
  );
  const [imageGridRef, fluidImageItems, setFluidImageItems] = useDragAndDrop<ImageFormItem, HTMLDivElement>(
    imagens,
    imageDragConfig,
  );

  const syncComposicaoByMaterial = useCallback((nextMaterial: string, source: "auto" | "manual", compositionOverride?: string) => {
    const materialOption = MATERIAL_OPTIONS.find((option) => option.nome === nextMaterial);
    const nextComposition = compositionOverride ?? materialOption?.composicao;

    if (nextComposition) {
      setValue("composicao", nextComposition, { shouldDirty: true });
      autoComposicaoRef.current = true;
      return;
    }

    if (source === "manual" || autoComposicaoRef.current) {
      setValue("composicao", "", { shouldDirty: true });
      autoComposicaoRef.current = source === "auto";
    }
  }, [setValue]);

  function handleMaterialChange(value: string, option?: CustomDatalistOption) {
    autoMaterialRef.current = false;
    setValue("material", value, { shouldDirty: true });
    syncComposicaoByMaterial(value, "manual", option?.metadata?.composition);
  }

  async function uploadImageToCloudinary(image: ImageFormItem): Promise<ImageFormItem> {
    if (!image.file) return image;

    const uploadAltText = image.altText.trim() || image.file.name;
    const signatureResponse = await fetch("/api/cloudinary/signature", {
      body: JSON.stringify({
        context: `alt=${uploadAltText}`,
        tags: "ficha_prod,next",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!signatureResponse.ok) {
      throw new Error("Cloudinary não está configurado para upload.");
    }

    const signatureData = (await signatureResponse.json()) as {
      apiKey: string;
      cloudName: string;
      folder: string;
      signature: string;
      timestamp: number;
      transformation: string;
    };
    const uploadData = new FormData();
    uploadData.append("file", image.file);
    uploadData.append("api_key", signatureData.apiKey);
    uploadData.append("timestamp", String(signatureData.timestamp));
    uploadData.append("signature", signatureData.signature);
    uploadData.append("folder", signatureData.folder);
    uploadData.append("transformation", signatureData.transformation);
    uploadData.append("context", `alt=${uploadAltText}`);
    uploadData.append("tags", "ficha_prod,next");

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`, {
      body: uploadData,
      method: "POST",
    });

    if (!uploadResponse.ok) {
      throw new Error(`Falha ao enviar ${uploadAltText}.`);
    }

    const uploadResult = (await uploadResponse.json()) as {
      bytes?: number;
      height?: number;
      public_id: string;
      secure_url: string;
      width?: number;
    };

    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }

    return {
      altText: image.altText,
      bytes: uploadResult.bytes,
      height: uploadResult.height,
      id: uploadResult.public_id,
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      width: uploadResult.width,
    };
  }

  const scheduleDraftSnapshotPersist = useCallback(() => {
    if (mode !== "create") return;

    if (draftAutosaveTimerRef.current) {
      window.clearTimeout(draftAutosaveTimerRef.current);
    }

    draftAutosaveTimerRef.current = window.setTimeout(() => {
      const form = formRef.current;
      if (!form) return;

      const snapshot = buildFichaDraftSnapshot(form, getValues(), getValues("imagens"));
      if (hasMeaningfulFichaDraft(snapshot.initialData)) {
        writeFichaDraftSnapshot(snapshot);
      } else {
        clearCreateFichaDraftSnapshot();
      }
      draftAutosaveTimerRef.current = null;
    }, 350);
  }, [getValues, mode]);

  const handleImageFiles = useCallback((files: File[]) => {
    const selectedFiles = files.filter((file) => file.type.startsWith("image/"));
    const availableSlots = 4 - imagens.length;
    const filesToAdd = selectedFiles.slice(0, availableSlots);

    if (selectedFiles.length === 0) {
      toast.warning("Imagem inválida", {
        description: "Selecione arquivos de imagem para adicionar.",
      });
      return;
    }

    if (availableSlots <= 0) {
      toast.warning("Limite atingido", {
        description: "A ficha aceita no máximo 4 imagens.",
      });
      return;
    }

    if (selectedFiles.length > filesToAdd.length) {
      toast.info("Limite de imagens", {
        description: "Apenas as primeiras imagens dentro do limite serão adicionadas.",
      });
    }

    const localImages = filesToAdd.map((file, index) => ({
      altText: "",
      file,
      id: `local-${Date.now()}-${index}-${file.name}`,
      previewUrl: URL.createObjectURL(file),
    }));

    const currentImages = getValues("imagens");
    appendImageItem(localImages);
    setFluidImageItems([...currentImages, ...localImages]);
    scheduleDraftSnapshotPersist();
  }, [appendImageItem, getValues, imagens.length, scheduleDraftSnapshotPersist, setFluidImageItems]);

  function handleImageSelection(files: FileList | null) {
    handleImageFiles(Array.from(files ?? []));
  }

  function handleImageDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);

    if (droppedFiles.length > 0) {
      handleImageFiles(droppedFiles);
    }
  }

  async function handleRemoveImage(image: ImageFormItem) {
    const imageIndex = getValues("imagens").findIndex((item) => item.id === image.id);
    if (imageIndex >= 0) {
      removeImageItemAt(imageIndex);
      setFluidImageItems((current) => current.filter((item) => item.id !== image.id));
      scheduleDraftSnapshotPersist();
    }

    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }

    if (image.persisted) {
      toast.info("Imagem removida da ficha", {
        description: "A imagem será removida da ficha ao salvar as alterações.",
      });
      return;
    }

    if (!image.publicId) {
      return;
    }

    try {
      const query = mode === "edit" && ficha?.id ? `?excludeFichaId=${encodeURIComponent(ficha.id)}` : "";
      await fetch(`/api/cloudinary/image/${getCloudinaryImagePath(image.publicId)}${query}`, {
        method: "DELETE",
      });
    } catch {
      toast.warning("Imagem removida", {
        description: "A referência foi removida, mas não foi possível excluir o arquivo agora.",
      });
    }
  }

  function hasMeaningfulDraft() {
    const form = formRef.current;
    if (!form) return false;

    const formData = new FormData(form);
    const textFields = [
      "cliente",
      "clienteAuxiliar",
      "vendedor",
      "dataInicio",
      "dataEntrega",
      "numeroVenda",
      "material",
      "composicao",
      "corMaterial",
      "manga",
      "larguraManga",
      "corAcabamentoManga",
      "gola",
      "corGola",
      "corDetalheGola",
      "larguraGola",
      "corBotao",
      "listaNomesRaw",
      "observacoes",
    ];

    if (textFields.some((field) => String(formData.get(field) ?? "").trim())) return true;
    if (Boolean(formData.get("evento"))) return true;
    if (itens.some((item) => item.produto.trim() || item.tamanho.trim() || item.detalhesProduto.trim())) return true;
    return imagens.length > 0;
  }

  function buildCurrentDraftSnapshot(imageItems = imagens) {
    const form = formRef.current;
    if (!form) return null;

    return buildFichaDraftSnapshot(form, getValues(), imageItems);
  }

  function persistCurrentDraftSnapshot(imageItems = imagens) {
    if (mode !== "create") return;

    const snapshot = buildCurrentDraftSnapshot(imageItems);
    if (!snapshot) return;

    if (!hasMeaningfulFichaDraft(snapshot.initialData)) {
      clearCreateFichaDraftSnapshot();
      return;
    }

    writeFichaDraftSnapshot(snapshot);
  }

  function openListaNomesModal() {
    setListaNomesDraft(getValues("listaNomesRaw"));
    setListaNomesModalOpen(true);
  }

  function saveListaNomesRaw() {
    setValue("listaNomesRaw", listaNomesDraft, { shouldDirty: true });
    setListaNomesModalOpen(false);
  }

  function hasUnsavedChanges() {
    if (isSubmittingRef.current) return false;

    const snapshot = buildCurrentDraftSnapshot();
    if (!snapshot) return false;

    if (mode === "create") {
      return hasMeaningfulFichaDraft(snapshot.initialData);
    }

    return initialDraftComparableRef.current !== getComparableFichaDraft(snapshot.initialData);
  }

  function closePendingNavigationDialog() {
    setPendingNavigationHref(null);
  }

  function confirmPendingNavigation() {
    const href = pendingNavigationHref;
    if (!href) return;

    if (mode === "create") {
      persistCurrentDraftSnapshot();
    }
    closePendingNavigationDialog();
    router.push(href);
  }

  function applyParsedLegacyImport(nextImport: ImportedLegacyState) {
    onApplyImportedLegacyState(nextImport);
  }

  function confirmPendingLegacyImport() {
    if (!pendingLegacyImport) return;
    applyParsedLegacyImport(pendingLegacyImport);
    setPendingLegacyImport(null);
  }

  function cancelPendingLegacyImport() {
    setPendingLegacyImport(null);
  }

  async function handleLegacyImportSelection(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsedJson = JSON.parse(rawText) as unknown;
      const parsedImport = parseLegacyFichaJson(parsedJson, catalogOptions);
      const nextImport: ImportedLegacyState = {
        fileName: file.name,
        importedAt: Date.now(),
        initialData: mapLegacyDraftToFichaFormInitialData(parsedImport.draft),
        warnings: parsedImport.warnings,
      };

      if (hasMeaningfulDraft()) {
        setPendingLegacyImport(nextImport);
      } else {
        applyParsedLegacyImport(nextImport);
      }
    } catch (error) {
      toast.error("Importação inválida", {
        description: error instanceof Error ? error.message : "Não foi possível ler este JSON.",
      });
    } finally {
      if (legacyImportInputRef.current) {
        legacyImportInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submitAfterUploadRef.current) {
      submitAfterUploadRef.current = false;
      return;
    }

    persistCurrentDraftSnapshot();

    const hasBlockedImportedImages = imagens.some((image) => image.saveBlocked);
    if (hasBlockedImportedImages) {
      event.preventDefault();
      isSubmittingRef.current = false;
      toast.error("Revise as imagens importadas", {
        description: "Remova ou substitua as imagens importadas apenas como rascunho antes de salvar a ficha.",
      });
      return;
    }

    const hasPendingImages = imagens.some((image) => image.file);

    if (!hasPendingImages) {
      isSubmittingRef.current = true;
      return;
    }
    if (shouldLetServerValidateBeforeUpload(new FormData(event.currentTarget))) {
      isSubmittingRef.current = true;
      return;
    }

    event.preventDefault();
    setIsUploadingImage(true);

    try {
      const pendingUploadCount = imagens.filter((image) => image.file).length;
      const uploadToast = toast.promise(
        Promise.all(imagens.map((image) => uploadImageToCloudinary(image))),
        {
          error: (error) => error instanceof Error ? error.message : "Falha ao enviar imagens.",
          loading: pendingUploadCount === 1 ? "Enviando imagem" : "Enviando imagens",
          success: pendingUploadCount === 1 ? "Imagem enviada" : "Imagens enviadas",
        },
      );
      const uploadedImages = await uploadToast.unwrap();

      flushSync(() => {
        replaceImageItems(uploadedImages);
        setFluidImageItems(uploadedImages);
      });
      if (imagensJsonInputRef.current) {
        imagensJsonInputRef.current.value = serializeImageItems(uploadedImages);
      }
      persistCurrentDraftSnapshot(uploadedImages);
      isSubmittingRef.current = true;
      submitAfterUploadRef.current = true;
      formRef.current?.requestSubmit();
    } catch {
      isSubmittingRef.current = false;
    } finally {
      setIsUploadingImage(false);
    }
  }

  useEffect(() => {
    if (state.status !== "error") return;

    isSubmittingRef.current = false;

    if (state.message && lastToastMessageRef.current !== state.message) {
      const message = state.message;
      window.setTimeout(() => {
        toast.error("Pendência na ficha", {
          description: message,
          id: "ficha-form-error",
        });
      }, 0);
      lastToastMessageRef.current = message;
    }

    const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']");
    firstInvalid?.focus();
  }, [state]);

  useEffect(() => {
    if (!importedLegacyState) return;
    if (lastImportedLegacyToastRef.current === importedLegacyState.importedAt) return;

    const warningCount = importedLegacyState.warnings.length;
    const imageCount = importedLegacyState.initialData.imagens.length;
    toast.success("JSON importado", {
      description: warningCount > 0
        ? `${importedLegacyState.fileName}: ${imageCount} imagem(ns) aproveitada(s) e ${warningCount} aviso(s) de conversão parcial.`
        : `${importedLegacyState.fileName}: rascunho preenchido.`,
    });
    lastImportedLegacyToastRef.current = importedLegacyState.importedAt;
  }, [importedLegacyState]);

  useEffect(() => {
    imagensRef.current = imagens;
  }, [imagens]);

  useEffect(() => {
    initialDraftComparableRef.current = getComparableFichaDraft(initialData);
  }, [initialData]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges()) return;

      if (mode === "create") {
        persistCurrentDraftSnapshot();
      }
      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || !hasUnsavedChanges()) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      if (mode === "create") {
        persistCurrentDraftSnapshot();
      }
      setPendingNavigationHref(`${url.pathname}${url.search}${url.hash}`);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  });

  useEffect(() => {
    const grid = imageGridRef.current;
    if (!grid) return;

    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      setImageGridWidth((current) => (width > 0 && width !== current ? width : current));
    });

    observer.observe(grid);

    return () => observer.disconnect();
  }, [imageGridRef, imagens]);

  useEffect(() => {
    if (!hasUniqueItemIds(fluidProductItems)) {
      return;
    }

    const sameOrder = haveSameItemOrder(fluidProductItems, itens);
    if (!sameOrder && fluidProductItems.length === itens.length) {
      replaceProductItems(fluidProductItems);
    }
  }, [fluidProductItems, itens, replaceProductItems]);

  useEffect(() => {
    if (!hasUniqueItemIds(fluidImageItems)) {
      return;
    }

    const sameOrder = haveSameItemOrder(fluidImageItems, imagens);
    if (!sameOrder && fluidImageItems.length === imagens.length) {
      replaceImageItems(fluidImageItems);
    }
  }, [fluidImageItems, imagens, replaceImageItems]);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length === 0) return;

      event.preventDefault();
      handleImageFiles(files);
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleImageFiles]);

  useEffect(() => {
    const form = formRef.current;

    return () => {
      if (mode === "create" && !isSubmittingRef.current && form) {
        const snapshot = buildFichaDraftSnapshot(form, getValues(), getValues("imagens"));
        if (hasMeaningfulFichaDraft(snapshot.initialData)) {
          writeFichaDraftSnapshot(snapshot);
        } else {
          clearCreateFichaDraftSnapshot();
        }
      }
      imagensRef.current.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      if (sortFeedbackTimerRef.current) {
        window.clearTimeout(sortFeedbackTimerRef.current);
      }
      if (draftAutosaveTimerRef.current) {
        window.clearTimeout(draftAutosaveTimerRef.current);
      }
      if (applyingObservacoesAutoTimerRef.current) {
        window.clearTimeout(applyingObservacoesAutoTimerRef.current);
      }
    };
  }, [getValues, mode]);

  useEffect(() => {
    const produtoNormalizado = normalizeProductForRule(primeiroProduto);

    if (!produtoNormalizado) {
      if (autoGolaRef.current) {
        setValue("gola", "", { shouldDirty: true });
        autoGolaRef.current = false;
      }

      if (autoMaterialRef.current) {
        setValue("material", "", { shouldDirty: true });
        autoMaterialRef.current = false;
        if (autoComposicaoRef.current) {
          setValue("composicao", "", { shouldDirty: true });
          autoComposicaoRef.current = false;
        }
      }
      return;
    }

    const golaAutomatica = produtoNormalizado.includes("social")
      ? (findOptionByName(golaOptions, "social")?.value ?? findOptionByName(golaOptions, "social")?.label ?? "social")
      : produtoNormalizado.includes("polo")
        ? (findOptionByName(golaOptions, "polo")?.value ?? findOptionByName(golaOptions, "polo")?.label ?? "polo")
        : "";

    if (golaAutomatica && (!gola || autoGolaRef.current)) {
      setValue("gola", golaAutomatica, { shouldDirty: true });
      autoGolaRef.current = true;
    } else if (!golaAutomatica && autoGolaRef.current && gola) {
      setValue("gola", "", { shouldDirty: true });
      autoGolaRef.current = false;
    }

    const materialAutomatico =
      produtoNormalizado === HELANCA_PRODUCT ? "Helanca" : BRIM_PRODUCTS.has(produtoNormalizado) ? "Brim" : "";

    if (materialAutomatico && (!material.trim() || autoMaterialRef.current)) {
      const materialOption = findOptionByName(materialOptions, materialAutomatico);
      const materialValue = materialOption?.value ?? materialOption?.label ?? materialAutomatico;
      setValue("material", materialValue, { shouldDirty: true });
      autoMaterialRef.current = true;
      syncComposicaoByMaterial(materialValue, "auto", materialOption?.metadata?.composition);
    } else if (!materialAutomatico && autoMaterialRef.current && material.trim()) {
      setValue("material", "", { shouldDirty: true });
      autoMaterialRef.current = false;
      if (autoComposicaoRef.current) {
        setValue("composicao", "", { shouldDirty: true });
        autoComposicaoRef.current = false;
      }
    }
  }, [gola, golaOptions, material, materialOptions, primeiroProduto, setValue, syncComposicaoByMaterial]);

  function updateProductItem(id: string, field: keyof Omit<ProductFormItem, "id">, value: string) {
    const nextValue = field === "tamanho" ? normalizeProductSize(value) : value;
    const itemIndex = getValues("itens").findIndex((item) => item.id === id);
    if (itemIndex >= 0) {
      setValue(`itens.${itemIndex}.${field}`, nextValue, { shouldDirty: true });
      setFluidProductItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: nextValue } : item)));
      scheduleDraftSnapshotPersist();
    }
  }

  function addProductItem() {
    const current = getValues("itens");
    const item = createEmptyProductItem(`item-${Date.now()}-${current.length}`);
    appendProductItem(item);
    setFluidProductItems([...current, item]);
    scheduleDraftSnapshotPersist();
  }

  function duplicateProductItem(id: string, position: "above" | "below") {
    const current = getValues("itens");
    const itemIndex = current.findIndex((candidate) => candidate.id === id);
    const item = current[itemIndex];
    if (!item || itemIndex < 0) return;

    const duplicated = { ...item, id: `item-${Date.now()}-${current.length}`, quantidade: "", tamanho: "" };
    const nextItems = [...current];
    nextItems.splice(position === "above" ? itemIndex : itemIndex + 1, 0, duplicated);
    replaceProductItems(nextItems);
    setFluidProductItems(nextItems);
    scheduleDraftSnapshotPersist();
  }

  function getClearableProductFieldKey(id: string, field: ClearableProductField) {
    return `${id}:${field}`;
  }

  function getProductFieldValue(id: string, field: ClearableProductField) {
    return getValues("itens").find((item) => item.id === id)?.[field] ?? "";
  }

  function handleClearableProductFieldFocus(id: string, field: ClearableProductField) {
    const currentValue = getProductFieldValue(id, field);
    if (!currentValue) return;

    const key = getClearableProductFieldKey(id, field);
    clearedProductFieldsRef.current.set(key, { edited: false, value: currentValue });
    updateProductItem(id, field, "");
  }

  function handleClearableProductFieldChange(id: string, field: ClearableProductField, value: string) {
    const key = getClearableProductFieldKey(id, field);
    const clearedField = clearedProductFieldsRef.current.get(key);

    if (clearedField) {
      clearedProductFieldsRef.current.set(key, { ...clearedField, edited: true });
    }

    updateProductItem(id, field, value);
  }

  function handleClearableProductFieldBlur(id: string, field: ClearableProductField) {
    const key = getClearableProductFieldKey(id, field);
    const clearedField = clearedProductFieldsRef.current.get(key);
    if (!clearedField) return;

    clearedProductFieldsRef.current.delete(key);
    if (!clearedField.edited) {
      updateProductItem(id, field, clearedField.value);
    }
  }

  function focusProductColumnItem(column: string, index: number) {
    const selector = `[data-product-column="${column}"][data-product-index="${index}"]`;
    const control = productsListRef.current?.querySelector<HTMLInputElement>(selector);
    control?.focus();
    control?.select();
    return Boolean(control);
  }

  function handleProductColumnTab(event: KeyboardEvent<HTMLInputElement>, column: string, index: number) {
    if (event.key !== "Tab") return;

    const nextIndex = index + (event.shiftKey ? -1 : 1);
    if (nextIndex < 0 || nextIndex >= fluidProductItems.length) return;

    event.preventDefault();
    focusProductColumnItem(column, nextIndex);
  }

  function removeProductItem(id: string) {
    const current = getValues("itens");
    const itemIndex = current.findIndex((item) => item.id === id);

    if (current.length > 1 && itemIndex >= 0) {
      removeProductItemAt(itemIndex);
      setFluidProductItems(current.filter((item) => item.id !== id));
      scheduleDraftSnapshotPersist();
      return;
    }

    const emptyItem = createEmptyProductItem();
    setValue("itens", [emptyItem], { shouldDirty: true });
    setFluidProductItems([emptyItem]);
    scheduleDraftSnapshotPersist();
  }

  function showProductSortFeedback() {
    setSortFeedbackVisible(true);

    if (sortFeedbackTimerRef.current) {
      window.clearTimeout(sortFeedbackTimerRef.current);
    }

    sortFeedbackTimerRef.current = window.setTimeout(() => {
      setSortFeedbackVisible(false);
      sortFeedbackTimerRef.current = null;
    }, 2200);
  }

  function sortProductItems() {
    const sortedItems = [...getValues("itens")].sort((a, b) => {
      const byModelBlock = Number(isBabyLookProduct(a.produto)) - Number(isBabyLookProduct(b.produto));
      if (byModelBlock !== 0) return byModelBlock;
      const bySize = compareProductSize(a.tamanho, b.tamanho);
      if (bySize !== 0) return bySize;
      return a.produto.localeCompare(b.produto, "pt-BR", { sensitivity: "base" });
    });

    showProductSortFeedback();
    replaceProductItems(sortedItems);
    setFluidProductItems(sortedItems);
    scheduleDraftSnapshotPersist();
  }

  function applyRichTextCommand(command: RichTextCommand) {
    if (!observacoesEditor) return;

    const chain = observacoesEditor.chain().focus();
    if (command === "bold") chain.toggleBold().run();
    if (command === "italic") chain.toggleItalic().run();
    if (command === "underline") chain.toggleUnderline().run();
    if (command === "insertUnorderedList") chain.toggleBulletList().run();
    if (command === "insertOrderedList") chain.toggleOrderedList().run();
    if (command === "removeFormat") chain.unsetAllMarks().clearNodes().run();
  }

  function buildObservacoesAutofill() {
    const form = formRef.current;
    const currentValues = getValues();
    const produtoPrincipal = currentValues.itens.find((item) => item.produto.trim())?.produto ?? "";
    const currentAcabamentoManga = isRegataMode
      ? (currentValues.viesRegata === "sim" ? "vies" : "")
      : currentValues.acabamentoManga;

    return buildObservacoesTecnicas({
      acabamentoGola: currentValues.acabamentoGola,
      acabamentoManga: currentAcabamentoManga,
      arte: currentValues.arte,
      arteLabel: getControlLabel(form, "arte"),
      bolso: getControlLabel(form, "bolso"),
      comNomes: currentValues.comNomes,
      corBotao: getControlLabel(form, "corBotao"),
      corAberturaLateral: getControlLabel(form, "corAberturaLateral"),
      corAcabamentoManga: getControlLabel(form, "corAcabamentoManga"),
      corFaixa: getControlLabel(form, "faixaCor"),
      corFilete: getControlLabel(form, "fileteCor"),
      corDetalheGola: getControlLabel(form, "corDetalheGola"),
      corGola: getControlLabel(form, "corGola"),
      corMaterial: getControlLabel(form, "corMaterial"),
      corPeDeGolaExterno: getControlLabel(form, "corPeDeGolaExterno"),
      corPeDeGolaInterno: getControlLabel(form, "corPeDeGolaInterno"),
      corPeitilhoExterno: getControlLabel(form, "corPeitilhoExterno"),
      corPeitilhoInterno: getControlLabel(form, "corPeitilhoInterno"),
      corReforco: getControlLabel(form, "corReforco"),
      corSublimacao: getControlLabel(form, "corSublimacao"),
      faixa: currentValues.faixa,
      faixaLocal: getControlLabel(form, "faixaLocal"),
      filete: currentValues.filete,
      fileteLocal: getControlLabel(form, "fileteLocal"),
      gola: currentValues.gola,
      larguraGola: getControlLabel(form, "larguraGola"),
      larguraManga: getControlLabel(form, "larguraManga"),
      manga: getControlLabel(form, "manga"),
      material: currentValues.material,
      produto: produtoPrincipal,
      reforcoGola: currentValues.reforcoGola,
    });
  }

  function setGeneratedObservacoes(nextObservacoes: string) {
    if (applyingObservacoesAutoTimerRef.current) {
      window.clearTimeout(applyingObservacoesAutoTimerRef.current);
    }

    const nextHtml = toObservationHtml(nextObservacoes);
    applyingObservacoesAutoRef.current = true;
    lastObservacoesAutofillRef.current = nextHtml;
    setValue("observacoes", nextHtml, { shouldDirty: true });
    if (observacoesEditor && observacoesEditor.getHTML() !== nextHtml) {
      observacoesEditor.commands.setContent(nextHtml, { emitUpdate: false });
    }

    applyingObservacoesAutoTimerRef.current = window.setTimeout(() => {
      applyingObservacoesAutoRef.current = false;
      applyingObservacoesAutoTimerRef.current = null;
    }, 0);
    scheduleDraftSnapshotPersist();
  }

  function updateObservacoesAutofill(options: { force?: boolean; notifyEmpty?: boolean; requireConfirmation?: boolean } = {}) {
    const generatedObservacoes = buildObservacoesAutofill();
    const currentObservacoes = getValues("observacoes");
    const manualSuffix = getManualObservationSuffix(currentObservacoes, lastObservacoesAutofillRef.current);
    const nextObservacoes = appendManualObservationText(generatedObservacoes, manualSuffix);
    const currentText = normalizeObservationComparison(currentObservacoes);
    const lastText = normalizeObservationComparison(lastObservacoesAutofillRef.current);
    const nextText = normalizeObservationComparison(nextObservacoes);
    const isManualText = Boolean(currentText) && currentText !== lastText && currentText !== nextText;

    if (!generatedObservacoes) {
      if (options.notifyEmpty) {
        toast.warning("Observações", {
          description: "Preencha pelo menos um produto antes de auto-preencher as observações.",
        });
      } else if (!currentText || currentText === lastText) {
        setGeneratedObservacoes("");
      }
      return;
    }

    if (!options.force && (isManualText || (observacoesAutoBlockedRef.current && currentText !== lastText))) {
      observacoesAutoBlockedRef.current = true;
      return;
    }

    if (options.requireConfirmation && isManualText) {
      setObservacoesConfirmationValue(nextObservacoes);
      return;
    }

    if (options.force) {
      observacoesAutoBlockedRef.current = false;
    }

    if (currentText === nextText && lastText === nextText) return;

    setGeneratedObservacoes(nextObservacoes);
  }

  function autofillObservacoes() {
    updateObservacoesAutofill({ force: true, notifyEmpty: true, requireConfirmation: true });
  }

  function closeObservacoesConfirmation() {
    setObservacoesConfirmationValue(null);
  }

  function confirmObservacoesAutofill() {
    if (!observacoesConfirmationValue) return;
    observacoesAutoBlockedRef.current = false;
    setGeneratedObservacoes(observacoesConfirmationValue);
    setObservacoesConfirmationValue(null);
  }

  function handleFormRealtimeObservacoes(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".rich-editor")) return;
    scheduleDraftSnapshotPersist();
    window.requestAnimationFrame(() => updateObservacoesAutofill());
  }

  function handleDraftPrint() {
    if (!formRef.current) return;
    setDraftPrintFicha(buildDraftPrintFicha(formRef.current, getValues()));
  }

  const serializedItems = JSON.stringify(
    itens
      .map((item) => ({
        detalhesProduto: item.detalhesProduto.trim(),
        produto: item.produto.trim(),
        quantidade: item.quantidade.trim(),
        tamanho: item.tamanho.trim().toUpperCase(),
      }))
      .filter((item) => item.produto || item.tamanho || item.quantidade || item.detalhesProduto),
  );
  const serializedImages = serializeImageItems(imagens);
  const lockedImageCardWidth = imageGridWidth ? getImageCardWidthFromGrid(imageGridWidth, imagens.length) : null;

  useEffect(() => {
    updateObservacoesAutofill();
  });

  useEffect(() => {
    if (!observacoesEditor) return;
    const nextContent = observacoes || "";
    const currentContent = observacoesEditor.isEmpty ? "" : observacoesEditor.getHTML();
    if (currentContent === nextContent) return;
    observacoesEditor.commands.setContent(nextContent, { emitUpdate: false });
  }, [observacoes, observacoesEditor]);

  return (
    <>
      <form
        ref={formRef}
        className="ficha-form"
        action={formAction}
        noValidate
        onInput={handleFormRealtimeObservacoes}
        onChange={handleFormRealtimeObservacoes}
        onSubmit={handleSubmit}
      >
      {ficha ? <input name="id" type="hidden" value={ficha.id} /> : null}
      <input ref={imagensJsonInputRef} name="imagensJson" type="hidden" value={serializedImages} />
      <input name="itensJson" type="hidden" value={serializedItems} />
      {state.message ? (
        <div className="form-banner" role="alert">
          {state.message}
        </div>
      ) : null}
      {canImportLegacyJson && mode === "create" ? (
        <div className="form-banner form-banner--soft">
          <div className="legacy-import-toolbar">
            <div>
              <strong>Importar JSON</strong>
            </div>
            <Button onClick={() => legacyImportInputRef.current?.click()} type="button" variant="secondary">
              <Upload aria-hidden="true" size={18} />
              Importar JSON
            </Button>
            <input
              ref={legacyImportInputRef}
              accept=".json,application/json"
              hidden
              onChange={(event) => {
                void handleLegacyImportSelection(event.currentTarget.files);
              }}
              type="file"
            />
          </div>
        </div>
      ) : null}
      {importedLegacyState?.warnings.length ? (
        <div className="form-banner" role="status">
          <strong>Importação parcial</strong>
          <ul className="legacy-import-warning-list">
            {importedLegacyState.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="form-grid">
        <fieldset className="form-section form-section--customer">
          <legend>
            <UserRound aria-hidden="true" size={18} />
            <span>Informações do Cliente</span>
          </legend>
          <Field label="Nome do Cliente" name="cliente" error={state.fieldErrors?.cliente} required>
            <CustomDatalist
              id="cliente"
              name="cliente"
              aria-describedby={state.fieldErrors?.cliente ? "cliente-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.cliente)}
              defaultValue={initialData.cliente || undefined}
              options={clienteOptions}
              placeholder="Nome do cliente…"
            />
          </Field>

          <Field label="Complemento do Nome (Alias)" name="clienteAuxiliar" error={state.fieldErrors?.clienteAuxiliar}>
            <input
              id="clienteAuxiliar"
              name="clienteAuxiliar"
              aria-describedby={state.fieldErrors?.clienteAuxiliar ? "clienteAuxiliar-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.clienteAuxiliar)}
              defaultValue={initialData.clienteAuxiliar || undefined}
              placeholder="Local, detalhe, cor…"
            />
          </Field>

          <Field label="Vendedor" name="vendedor" error={state.fieldErrors?.vendedor} required>
            <CustomDatalist
              id="vendedor"
              name="vendedor"
              aria-describedby={state.fieldErrors?.vendedor ? "vendedor-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.vendedor)}
              defaultValue={initialData.vendedor || undefined}
              options={vendedorOptions}
              placeholder="Digite o vendedor…"
            />
          </Field>

          <Field label="Data de Início" name="dataInicio" error={state.fieldErrors?.dataInicio}>
            <DatePickerField
              id="dataInicio"
              name="dataInicio"
              aria-describedby={state.fieldErrors?.dataInicio ? "dataInicio-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.dataInicio)}
              initialValue={initialData.dataInicio}
            />
          </Field>

          <Field label="Data de Entrega" name="dataEntrega" error={state.fieldErrors?.dataEntrega} required>
            <DatePickerField
              id="dataEntrega"
              name="dataEntrega"
              aria-describedby={state.fieldErrors?.dataEntrega ? "dataEntrega-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.dataEntrega)}
              initialValue={initialData.dataEntrega}
              onValueChange={setDeliveryDate}
              required
            />
          </Field>

          <Field label="Número da Venda" name="numeroVenda" error={state.fieldErrors?.numeroVenda}>
            <input
              id="numeroVenda"
              name="numeroVenda"
              aria-describedby={state.fieldErrors?.numeroVenda ? "numeroVenda-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.numeroVenda)}
              defaultValue={initialData.numeroVenda || undefined}
              inputMode="numeric"
              placeholder="Número da venda…"
            />
          </Field>

          <label className="checkbox-field checkbox-field--aligned">
            <input defaultChecked={initialData.evento} name="evento" type="checkbox" />
            <span>Pedido para evento?</span>
          </label>

          <DeliveryDeadlineAlert deliveryDate={deliveryDate} />
        </fieldset>

        <fieldset className="form-section form-section--products">
          <legend>
            <PackageOpen aria-hidden="true" size={18} />
            <span>Produtos</span>
          </legend>
          <div className="products-editor">
            <div className="products-editor__toolbar">
              <Button onClick={addProductItem} type="button" variant="secondary">
                <Plus aria-hidden="true" size={18} />
                Adicionar produto
              </Button>
              <div className="products-editor__toolbar-actions">
                <span
                  className="products-editor__sort-feedback"
                  data-visible={sortFeedbackVisible ? "true" : "false"}
                  role="status"
                >
                  Produtos ordenados
                </span>
                <Button
                  className="products-editor__sort-button"
                  onClick={sortProductItems}
                  onPointerDown={showProductSortFeedback}
                  type="button"
                  variant="secondary"
                >
                  <RotateCcw aria-hidden="true" size={18} />
                  Ordenar por tamanho
                </Button>
              </div>
            </div>
            <div className="products-editor__head" aria-hidden="true">
              <span></span>
              <span>Tam.</span>
              <span>Qtd.</span>
              <span>Produto</span>
              <span>Detalhes</span>
              <span>Ações</span>
            </div>
            <div className="products-editor__list" data-sorted={sortFeedbackVisible ? "true" : "false"} ref={productsListRef}>
              {fluidProductItems.map((item, index) => (
                <div
                  className="products-editor__row"
                  data-index={index}
                  key={item.id}
                >
                <span
                  aria-label={`Reordenar produto ${index + 1}`}
                  className="products-editor__drag"
                  role="button"
                  tabIndex={0}
                >
                  <GripVertical aria-hidden="true" size={16} />
                </span>
                <div className="products-editor__cell">
                  <span>Tam.</span>
                  <CustomDatalist
                    aria-label={`Tamanho do produto ${index + 1}`}
                    data-product-column="tamanho"
                    data-product-index={index}
                    id={`tamanho-${item.id}`}
                    inputMode="text"
                    onBlur={() => handleClearableProductFieldBlur(item.id, "tamanho")}
                    onFocus={() => handleClearableProductFieldFocus(item.id, "tamanho")}
                    onKeyDown={(event) => handleProductColumnTab(event, "tamanho", index)}
                    onValueChange={(value) => handleClearableProductFieldChange(item.id, "tamanho", value)}
                    options={sizeOptions}
                    placeholder="Tam."
                    value={item.tamanho ?? ""}
                  />
                </div>
                <label className="products-editor__cell">
                  <span>Qtd.</span>
                  <input
                    aria-label={`Quantidade do produto ${index + 1}`}
                    data-product-column="quantidade"
                    data-product-index={index}
                    inputMode="numeric"
                    onBlur={() => handleClearableProductFieldBlur(item.id, "quantidade")}
                    onChange={(event) => handleClearableProductFieldChange(item.id, "quantidade", event.currentTarget.value)}
                    onFocus={() => handleClearableProductFieldFocus(item.id, "quantidade")}
                    onKeyDown={(event) => handleProductColumnTab(event, "quantidade", index)}
                    placeholder="Qtd."
                    value={item.quantidade ?? ""}
                  />
                </label>
                <div className="products-editor__cell">
                  <span>Produto</span>
                  <CustomDatalist
                    aria-invalid={Boolean(state.fieldErrors?.itensJson)}
                    aria-label={`Produto ${index + 1}`}
                    data-product-column="produto"
                    data-product-index={index}
                    id={`produto-${item.id}`}
                    onKeyDown={(event) => handleProductColumnTab(event, "produto", index)}
                    onValueChange={(value) => updateProductItem(item.id, "produto", value)}
                    options={productOptions}
                    placeholder="Camiseta, polo, regata…"
                    value={item.produto ?? ""}
                  />
                </div>
                <label className="products-editor__cell">
                  <span>Detalhes</span>
                  <input
                    aria-label={`Detalhes do produto ${index + 1}`}
                    autoComplete="off"
                    data-product-column="detalhesProduto"
                    data-product-index={index}
                    onChange={(event) => updateProductItem(item.id, "detalhesProduto", event.currentTarget.value)}
                    onKeyDown={(event) => handleProductColumnTab(event, "detalhesProduto", index)}
                    placeholder="Opcional…"
                    value={item.detalhesProduto ?? ""}
                  />
                </label>
                <div className="products-editor__actions">
                  <div className="products-editor__copy-stack">
                    <Tooltip label="Copiar acima">
                      <button aria-label={`Duplicar produto ${index + 1} acima`} onClick={() => duplicateProductItem(item.id, "above")} type="button">
                        <ArrowUp aria-hidden="true" size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Copiar abaixo">
                      <button aria-label={`Duplicar produto ${index + 1} abaixo`} onClick={() => duplicateProductItem(item.id, "below")} type="button">
                        <ArrowDown aria-hidden="true" size={14} />
                      </button>
                    </Tooltip>
                  </div>
                  <Tooltip label="Remover produto">
                    <button
                      aria-label={`Remover produto ${index + 1}`}
                      className="products-editor__action-danger"
                      onClick={() => removeProductItem(item.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </Tooltip>
                </div>
                </div>
              ))}
            </div>
            <div className="products-editor__total" aria-live="polite">
              <span>Total de produtos</span>
              <strong>{productTotal}</strong>
            </div>
            {state.fieldErrors?.itensJson ? (
              <p className="field-error" id="itensJson-error">
                {state.fieldErrors.itensJson}
              </p>
            ) : null}
            {isRegataMode ? (
              <p className="products-editor__hint">
                Modo regata/colete ativo: manga comum fica oculta e o acabamento passa a usar viés.
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="form-section form-section--technical">
          <legend>
            <Cog aria-hidden="true" size={18} />
            <span>Especificações Técnicas</span>
          </legend>
          <Field label="Material" name="material" error={state.fieldErrors?.material}>
            <CustomDatalist
              id="material"
              name="material"
              aria-describedby={state.fieldErrors?.material ? "material-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.material)}
              onValueChange={handleMaterialChange}
              options={materialOptions}
              placeholder="Dry fit, algodão…"
              value={material ?? ""}
            />
          </Field>
          <Field label="Cor do material" name="corMaterial" error={state.fieldErrors?.corMaterial}>
            <CustomDatalist
              id="corMaterial"
              name="corMaterial"
              aria-describedby={state.fieldErrors?.corMaterial ? "corMaterial-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.corMaterial)}
              defaultValue={initialData.corMaterial || undefined}
              options={colorOptions}
              placeholder="Azul, branco, preto…"
            />
          </Field>
          <div className="form-subsection">
            <h3>Manga</h3>
          {isRegataMode ? (
            <>
              <input name="manga" type="hidden" value="" />
              <input name="acabamentoManga" type="hidden" value={acabamentoMangaValue ?? ""} />
              <Field label="Viés" name="viesRegata">
                <select
                  id="viesRegata"
                  onChange={(event) => setValue("viesRegata", event.currentTarget.value, { shouldDirty: true })}
                  value={viesRegata ?? ""}
                >
                  <option value="">-</option>
                  <option value="sim">Com Viés</option>
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Tipo de Manga" name="manga" error={state.fieldErrors?.manga}>
                <CustomDatalist
                  id="manga"
                  name="manga"
                  aria-describedby={state.fieldErrors?.manga ? "manga-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.manga)}
                  defaultValue={initialData.manga || undefined}
                  options={mangaOptions}
                  placeholder="-"
                />
              </Field>
              <Field label="Acabamento da manga" name="acabamentoManga" error={state.fieldErrors?.acabamentoManga}>
                <CustomDatalist
                  id="acabamentoManga"
                  name="acabamentoManga"
                  aria-describedby={state.fieldErrors?.acabamentoManga ? "acabamentoManga-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.acabamentoManga)}
                  onValueChange={(value) => setValue("acabamentoManga", value, { shouldDirty: true })}
                  options={acabamentoMangaOptions}
                  placeholder="-"
                  value={acabamentoManga ?? ""}
                />
              </Field>
            </>
          )}
          {showMangaExtras ? (
            <>
              <Field label="Largura da manga" name="larguraManga" error={state.fieldErrors?.larguraManga}>
                <input
                  id="larguraManga"
                  name="larguraManga"
                  aria-describedby={state.fieldErrors?.larguraManga ? "larguraManga-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.larguraManga)}
                  defaultValue={initialData.larguraManga || undefined}
                  placeholder="Ex: 3,5…"
                />
              </Field>
              <Field label="Cor do acabamento" name="corAcabamentoManga" error={state.fieldErrors?.corAcabamentoManga}>
                <CustomDatalist
                  id="corAcabamentoManga"
                  name="corAcabamentoManga"
                  aria-describedby={state.fieldErrors?.corAcabamentoManga ? "corAcabamentoManga-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.corAcabamentoManga)}
                  defaultValue={initialData.corAcabamentoManga || undefined}
                  options={colorOptions}
                  placeholder="Cor ou combinação…"
                />
              </Field>
            </>
          ) : null}
          </div>

          <div className="form-subsection">
            <h3>Gola</h3>
          <Field label="Tipo de Gola" name="gola" error={state.fieldErrors?.gola}>
            <CustomDatalist
              id="gola"
              name="gola"
              aria-describedby={state.fieldErrors?.gola ? "gola-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.gola)}
              onValueChange={(value) => {
                autoGolaRef.current = false;
                setValue("gola", value, { shouldDirty: true });
              }}
              options={golaOptions}
              placeholder="-"
              value={gola ?? ""}
            />
          </Field>
          {temGola && !isSocial ? (
            <Field label="Cor da gola" name="corGola" error={state.fieldErrors?.corGola}>
              <CustomDatalist
                id="corGola"
                name="corGola"
                aria-describedby={state.fieldErrors?.corGola ? "corGola-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.corGola)}
                defaultValue={initialData.corGola || undefined}
                options={colorOptions}
                placeholder="Cor ou combinação…"
              />
            </Field>
          ) : null}
          {!isPolo && !isSocial ? (
            <Field label="Acabamento da gola" name="acabamentoGola" error={state.fieldErrors?.acabamentoGola}>
              <CustomDatalist
                id="acabamentoGola"
                name="acabamentoGola"
                aria-describedby={state.fieldErrors?.acabamentoGola ? "acabamentoGola-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.acabamentoGola)}
                onValueChange={(value) => setValue("acabamentoGola", value, { shouldDirty: true })}
                options={acabamentoGolaOptions}
                placeholder="-"
                value={acabamentoGola ?? ""}
              />
            </Field>
          ) : null}
          {showLarguraGola ? (
            <Field label="Largura da gola" name="larguraGola" error={state.fieldErrors?.larguraGola}>
              <input
                id="larguraGola"
                name="larguraGola"
                aria-describedby={state.fieldErrors?.larguraGola ? "larguraGola-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.larguraGola)}
                defaultValue={initialData.larguraGola || undefined}
                placeholder="Ex: 2,5…"
              />
            </Field>
          ) : null}
          {isPadreEsportiva ? (
            <Field label="Cor do detalhe" name="corDetalheGola" error={state.fieldErrors?.corDetalheGola}>
              <CustomDatalist
                id="corDetalheGola"
                name="corDetalheGola"
                aria-describedby={state.fieldErrors?.corDetalheGola ? "corDetalheGola-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.corDetalheGola)}
                defaultValue={initialData.corDetalheGola || undefined}
                options={colorOptions}
                placeholder="Cor do detalhe..."
              />
            </Field>
          ) : null}
          {temGola && !isSocial ? (
            <Field label="Reforço de gola" name="reforcoGola" error={state.fieldErrors?.reforcoGola}>
              <select
                id="reforcoGola"
                name="reforcoGola"
                aria-describedby={state.fieldErrors?.reforcoGola ? "reforcoGola-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.reforcoGola)}
                onChange={(event) => setValue("reforcoGola", event.currentTarget.value, { shouldDirty: true })}
                value={reforcoGola ?? ""}
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </Field>
          ) : null}
          {showCorReforco ? (
            <Field label="Cor do reforço" name="corReforco" error={state.fieldErrors?.corReforco}>
              <CustomDatalist
                id="corReforco"
                name="corReforco"
                aria-describedby={state.fieldErrors?.corReforco ? "corReforco-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.corReforco)}
                defaultValue={initialData.corReforco || undefined}
                options={colorOptions}
                placeholder="Cor do reforço…"
              />
            </Field>
          ) : null}
          {isPolo ? (
            <>
              <Field label="Peitilho interno" name="corPeitilhoInterno" error={state.fieldErrors?.corPeitilhoInterno}>
                <CustomDatalist
                  id="corPeitilhoInterno"
                  name="corPeitilhoInterno"
                  aria-describedby={state.fieldErrors?.corPeitilhoInterno ? "corPeitilhoInterno-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.corPeitilhoInterno)}
                  defaultValue={initialData.corPeitilhoInterno || undefined}
                  options={colorOptions}
                  placeholder="Cor interna…"
                />
              </Field>
              <Field label="Peitilho externo" name="corPeitilhoExterno" error={state.fieldErrors?.corPeitilhoExterno}>
                <CustomDatalist
                  id="corPeitilhoExterno"
                  name="corPeitilhoExterno"
                  aria-describedby={state.fieldErrors?.corPeitilhoExterno ? "corPeitilhoExterno-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.corPeitilhoExterno)}
                  defaultValue={initialData.corPeitilhoExterno || undefined}
                  options={colorOptions}
                  placeholder="Cor externa…"
                />
              </Field>
            </>
          ) : null}
          {isPolo || isSocial ? (
            <Field label="Cor do botão" name="corBotao" error={state.fieldErrors?.corBotao}>
              <CustomDatalist
                id="corBotao"
                name="corBotao"
                aria-describedby={state.fieldErrors?.corBotao ? "corBotao-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.corBotao)}
                defaultValue={initialData.corBotao || undefined}
                options={colorOptions}
                placeholder="Branco, perolado…"
              />
            </Field>
          ) : null}
          {isSocial ? (
            <>
              <Field label="Pé de gola interno" name="corPeDeGolaInterno" error={state.fieldErrors?.corPeDeGolaInterno}>
                <CustomDatalist
                  id="corPeDeGolaInterno"
                  name="corPeDeGolaInterno"
                  aria-describedby={state.fieldErrors?.corPeDeGolaInterno ? "corPeDeGolaInterno-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.corPeDeGolaInterno)}
                  defaultValue={initialData.corPeDeGolaInterno || undefined}
                  options={colorOptions}
                  placeholder="Cor interna…"
                />
              </Field>
              <Field label="Pé de gola externo" name="corPeDeGolaExterno" error={state.fieldErrors?.corPeDeGolaExterno}>
                <CustomDatalist
                  id="corPeDeGolaExterno"
                  name="corPeDeGolaExterno"
                  aria-describedby={state.fieldErrors?.corPeDeGolaExterno ? "corPeDeGolaExterno-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.corPeDeGolaExterno)}
                  defaultValue={initialData.corPeDeGolaExterno || undefined}
                  options={colorOptions}
                  placeholder="Cor externa…"
                />
              </Field>
            </>
          ) : null}
          {isPolo ? (
            <Field label="Abertura lateral" name="aberturaLateral" error={state.fieldErrors?.aberturaLateral}>
              <select
                id="aberturaLateral"
                name="aberturaLateral"
                aria-describedby={state.fieldErrors?.aberturaLateral ? "aberturaLateral-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.aberturaLateral)}
                onChange={(event) => setValue("aberturaLateral", event.currentTarget.value, { shouldDirty: true })}
                value={aberturaLateral ?? ""}
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </Field>
          ) : null}
          {showCorAbertura ? (
            <Field label="Cor da abertura" name="corAberturaLateral" error={state.fieldErrors?.corAberturaLateral}>
              <CustomDatalist
                id="corAberturaLateral"
                name="corAberturaLateral"
                aria-describedby={state.fieldErrors?.corAberturaLateral ? "corAberturaLateral-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.corAberturaLateral)}
                defaultValue={initialData.corAberturaLateral || undefined}
                options={colorOptions}
                placeholder="Cor da abertura…"
              />
            </Field>
          ) : null}
          </div>

          <div className="form-subsection">
            <h3>Detalhes</h3>
          <Field label="Bolso" name="bolso" error={state.fieldErrors?.bolso}>
            <CustomDatalist
              id="bolso"
              name="bolso"
              aria-describedby={state.fieldErrors?.bolso ? "bolso-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.bolso)}
              defaultValue={initialData.bolso || undefined}
              options={bolsoOptions}
              placeholder="-"
            />
          </Field>
          <Field label="Filete" name="filete" error={state.fieldErrors?.filete}>
            <select
              id="filete"
              name="filete"
              aria-describedby={state.fieldErrors?.filete ? "filete-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.filete)}
              onChange={(event) => setValue("filete", event.currentTarget.value, { shouldDirty: true })}
              value={filete ?? ""}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </Field>
          {filete === "sim" ? (
            <>
              <Field label="Local do filete" name="fileteLocal" error={state.fieldErrors?.fileteLocal}>
                <input
                  id="fileteLocal"
                  name="fileteLocal"
                  aria-describedby={state.fieldErrors?.fileteLocal ? "fileteLocal-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.fileteLocal)}
                  defaultValue={initialData.fileteLocal || undefined}
                  placeholder="Manga, lateral…"
                />
              </Field>
              <Field label="Cor do filete" name="fileteCor" error={state.fieldErrors?.fileteCor}>
                <CustomDatalist
                  id="fileteCor"
                  name="fileteCor"
                  aria-describedby={state.fieldErrors?.fileteCor ? "fileteCor-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.fileteCor)}
                  defaultValue={initialData.fileteCor || undefined}
                  options={colorOptions}
                  placeholder="Cor do filete…"
                />
              </Field>
            </>
          ) : null}
          <Field label="Faixa refletiva" name="faixa" error={state.fieldErrors?.faixa}>
            <select
              id="faixa"
              name="faixa"
              aria-describedby={state.fieldErrors?.faixa ? "faixa-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.faixa)}
              onChange={(event) => setValue("faixa", event.currentTarget.value, { shouldDirty: true })}
              value={faixa ?? ""}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </Field>
          {faixa === "sim" ? (
            <>
              <Field label="Local da faixa" name="faixaLocal" error={state.fieldErrors?.faixaLocal}>
                <input
                  id="faixaLocal"
                  name="faixaLocal"
                  aria-describedby={state.fieldErrors?.faixaLocal ? "faixaLocal-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.faixaLocal)}
                  defaultValue={initialData.faixaLocal || undefined}
                  placeholder="Manga, costas…"
                />
              </Field>
              <Field label="Cor da faixa" name="faixaCor" error={state.fieldErrors?.faixaCor}>
                <CustomDatalist
                  id="faixaCor"
                  name="faixaCor"
                  aria-describedby={state.fieldErrors?.faixaCor ? "faixaCor-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.faixaCor)}
                  defaultValue={initialData.faixaCor || undefined}
                  options={colorOptions}
                  placeholder="Prata, verde…"
                />
              </Field>
            </>
          ) : null}
          </div>

          <div className="form-subsection">
            <h3>Arte / Personalização</h3>
          <Field label="Personalização" name="arte" error={state.fieldErrors?.arte}>
            <select
              id="arte"
              name="arte"
              aria-describedby={state.fieldErrors?.arte ? "arte-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.arte)}
              onChange={(event) => setValue("arte", event.currentTarget.value, { shouldDirty: true })}
              value={arte ?? ""}
            >
              <option value="">-</option>
              <option value="sem_personalizacao">Sem Personalização</option>
              <option value="sublimacao">Sublimação</option>
              <option value="serigrafia">Serigrafia</option>
              <option value="bordado">Bordado</option>
              <option value="patch">PATCH Termocolante</option>
              <option value="dtf">DTF Têxtil</option>
              <option value="transfer">Transfer</option>
              <option value="sublimacao_serigrafia">Sublimação e Serigrafia</option>
              <option value="serigrafia_dtf">Serigrafia e DTF</option>
              <option value="serigrafia_bordado">Serigrafia e Bordado</option>
            </select>
          </Field>
          <Field label="Nomes / números" name="comNomes" error={state.fieldErrors?.comNomes}>
            <select
              id="comNomes"
              name="comNomes"
              aria-describedby={state.fieldErrors?.comNomes ? "comNomes-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.comNomes)}
              onChange={(event) => setValue("comNomes", event.currentTarget.value, { shouldDirty: true })}
              value={comNomes ?? ""}
            >
              <option value="">Não informado</option>
              <option value="0">Nenhum</option>
              <option value="1">Com nomes</option>
              <option value="2">Com nomes e números</option>
              <option value="3">Somente números</option>
            </select>
          </Field>
          {showCorSublimacao ? (
            <Field label="Cor da sublimação" name="corSublimacao" error={state.fieldErrors?.corSublimacao}>
              <CustomDatalist
                id="corSublimacao"
                name="corSublimacao"
                aria-describedby={state.fieldErrors?.corSublimacao ? "corSublimacao-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.corSublimacao)}
                defaultValue={initialData.corSublimacao || undefined}
                options={colorOptions}
                placeholder="Cor principal…"
              />
            </Field>
          ) : null}
          <Field label="Composição" name="composicao" error={state.fieldErrors?.composicao}>
            <input
              id="composicao"
              name="composicao"
              aria-describedby={state.fieldErrors?.composicao ? "composicao-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.composicao)}
              onChange={(event) => {
                autoComposicaoRef.current = false;
                setValue("composicao", event.currentTarget.value, { shouldDirty: true });
              }}
              placeholder="100% poliéster…"
              value={composicao ?? ""}
            />
          </Field>
          <div className="etiqueta-group">
            <span className="etiqueta-group__label">Etiqueta</span>
            <input type="hidden" name="etiqueta" value={etiquetaValue} />
            <div className="etiqueta-options">
              {ETIQUETA_FIXAS.map((opcao) => (
                <label key={opcao} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={etiquetaSelecao === opcao}
                    onChange={() => setEtiquetaSelecao(etiquetaSelecao === opcao ? "" : opcao)}
                  />
                  <span>{opcao}</span>
                </label>
              ))}
              <div className="etiqueta-outra-row">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={etiquetaSelecao === "Outra"}
                    onChange={() => setEtiquetaSelecao(etiquetaSelecao === "Outra" ? "" : "Outra")}
                  />
                  <span>Outra</span>
                </label>
                {etiquetaSelecao === "Outra" ? (
                  <input
                    autoFocus
                    className="etiqueta-outra-input"
                    type="text"
                    value={etiquetaOutra}
                    onChange={(e) => setEtiquetaOutra(e.currentTarget.value)}
                    placeholder="Nome da etiqueta…"
                  />
                ) : null}
              </div>
            </div>
          </div>
          </div>
          <div className="form-subsection form-subsection--single">
            <h3>Observações</h3>
          <Field label="Observações" name="observacoes" error={state.fieldErrors?.observacoes} full>
            <input name="observacoes" type="hidden" value={observacoes} />
            <input name="listaNomesRaw" type="hidden" value={listaNomesRaw ?? ""} />
            <div className="name-list-attachment">
              <Button className="name-list-attachment__button" onClick={openListaNomesModal} type="button" variant="secondary">
                <ClipboardList aria-hidden="true" size={16} />
                {listaNomesRaw?.trim() ? "Editar lista de nomes" : "Adicionar lista de nomes"}
              </Button>
              {listaNomesRaw?.trim() ? <span>Lista pendente anexada</span> : null}
            </div>
            <div className="rich-editor">
              <div className="rich-editor__toolbar" aria-label="Ferramentas de observacoes" role="toolbar">
                <button aria-label="Negrito" onClick={() => applyRichTextCommand("bold")} type="button">
                  <Bold aria-hidden="true" size={16} />
                </button>
                <button aria-label="Italico" onClick={() => applyRichTextCommand("italic")} type="button">
                  <Italic aria-hidden="true" size={16} />
                </button>
                <button aria-label="Sublinhado" onClick={() => applyRichTextCommand("underline")} type="button">
                  <Underline aria-hidden="true" size={16} />
                </button>
                <button aria-label="Lista" onClick={() => applyRichTextCommand("insertUnorderedList")} type="button">
                  <List aria-hidden="true" size={16} />
                </button>
                <button aria-label="Lista numerada" onClick={() => applyRichTextCommand("insertOrderedList")} type="button">
                  <ListOrdered aria-hidden="true" size={16} />
                </button>
                <button aria-label="Limpar formatacao" onClick={() => applyRichTextCommand("removeFormat")} type="button">
                  <RotateCcw aria-hidden="true" size={16} />
                </button>
                <button className="rich-editor__autofill" onClick={autofillObservacoes} type="button">
                  <Wand2 aria-hidden="true" size={16} />
                  Auto-preencher
                </button>
              </div>
              <EditorContent
                className="rich-editor__content"
                data-empty={getPlainTextFromHtml(observacoes) ? "false" : "true"}
                editor={observacoesEditor}
              />
            </div>
          </Field>
          </div>
        </fieldset>

        <fieldset className="form-section form-section--media">
          <legend>
            <Images aria-hidden="true" size={18} />
            <span>Arte / Imagens do Produto</span>
          </legend>
          <div
            className="image-upload-panel"
            data-has-images={imagens.length > 0 ? "true" : "false"}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleImageDrop}
          >
            <div className="image-upload-panel__intro">
              <Images aria-hidden="true" size={28} />
              <div>
                <strong>Imagens do produto</strong>
                <span>{imagens.length}/4 imagens adicionadas</span>
              </div>
            </div>

            {imagens.length > 0 ? (
              <div ref={imageGridRef} className="image-upload-grid" data-count={imagens.length}>
                {fluidImageItems.map((image, index) => (
                  <article
                    className="image-upload-card"
                    data-index={index}
                    data-image-id={image.id}
                    key={image.id}
                    style={{
                      ...(lockedImageCardWidth
                        ? {
                            maxWidth: `${lockedImageCardWidth}px`,
                            minWidth: `${lockedImageCardWidth}px`,
                            width: `${lockedImageCardWidth}px`,
                          }
                        : null),
                    }}
                  >
                    <div className="image-upload-card__top">
                      <span className="image-upload-card__order" aria-hidden="true">
                        <GripVertical aria-hidden="true" size={15} />
                        Imagem {index + 1}
                      </span>
                      {image.file ? (
                        <span className="image-upload-card__badge">Pendente</span>
                      ) : image.saveBlocked ? (
                        <span className="image-upload-card__badge">Rascunho</span>
                      ) : image.importMode === "legacy-saveable" ? (
                        <span className="image-upload-card__badge">Importada</span>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      <button
                        aria-label="Remover imagem"
                        className="image-upload-card__remove"
                        onClick={() => void handleRemoveImage(image)}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                    <div className="image-upload-card__preview">
                      <div
                        aria-label={image.altText || "Imagem do produto"}
                        className="image-upload-card__preview-image"
                        role="img"
                        style={{ backgroundImage: `url("${image.previewUrl ?? image.secureUrl}")` }}
                      />
                    </div>
                    <label>
                      <span>Descrição</span>
                      <input
                        aria-label="Descrição da imagem"
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          updateImageItem(index, { ...image, altText: value });
                          setFluidImageItems((current) =>
                            current.map((item) => (item.id === image.id ? { ...item, altText: value } : item)),
                          );
                        }}
                        onTouchStart={(event) => event.stopPropagation()}
                        placeholder="Ex: frente, costas, detalhe do bordado"
                        value={image.altText}
                      />
                    </label>
                    {image.importWarning ? <p className="image-upload-card__warning">{image.importWarning}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="image-upload-empty">Nenhuma imagem adicionada.</p>
            )}

            <label className="image-upload-button">
              <Upload aria-hidden="true" size={18} />
              <span>{isUploadingImage ? "Enviando…" : "Selecionar imagens"}</span>
              <input
                accept="image/*"
                disabled={isUploadingImage || imagens.length >= 4}
                multiple
                onChange={(event) => {
                  handleImageSelection(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
            {state.fieldErrors?.imagensJson ? (
              <p className="field-error" id="imagensJson-error">
                {state.fieldErrors.imagensJson}
              </p>
            ) : null}
          </div>
        </fieldset>
      </div>
      <div className="form-actions">
        <label className="checkbox-field checkbox-field--print">
          <input
            checked={includeRawNameListOnPrint && hasListaNomesRaw}
            disabled={!hasListaNomesRaw}
            onChange={(event) => setIncludeRawNameListOnPrint(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>Imprimir Lista de Nomes</span>
        </label>
        {mode === "edit" && ficha?.id ? (
          <PrintTriggerButton className="ui-button ui-button--secondary ficha-print-action" href={printFichaHref} label={`Imprimir ficha ${ficha.cliente_nome_snapshot}`}>
            <Printer aria-hidden="true" size={18} />
            Imprimir ficha
          </PrintTriggerButton>
        ) : (
          <button
            aria-label="Imprimir rascunho da ficha"
            className="ui-button ui-button--secondary ficha-print-action"
            onClick={handleDraftPrint}
            type="button"
          >
            <Printer aria-hidden="true" size={18} />
            Imprimir ficha
          </button>
        )}
        <SubmitButton isUploading={isUploadingImage} label={mode === "edit" ? "Salvar alterações" : "Salvar ficha"} />
      </div>
        {draftPrintFicha ? <DraftPrintLayer ficha={draftPrintFicha} includeRawNameList={includeRawNameListOnPrint} onPrinted={() => setDraftPrintFicha(null)} /> : null}
      </form>

      {listaNomesModalOpen ? (
        <Modal onClose={() => setListaNomesModalOpen(false)} size="md" title="Lista de nomes">
          <section className="name-list-modal">
            <header className="name-list-modal__header">
              <h2>Lista de nomes</h2>
            </header>
            <label className="field" htmlFor="listaNomesRawModal">
              <span>Lista recebida</span>
              <textarea
                id="listaNomesRawModal"
                maxLength={10000}
                onChange={(event) => setListaNomesDraft(event.currentTarget.value)}
                placeholder="Cole a lista aqui..."
                rows={14}
                value={listaNomesDraft}
              />
            </label>
            <div className="name-list-modal__actions">
              <Button onClick={() => setListaNomesModalOpen(false)} type="button" variant="ghost">
                Cancelar
              </Button>
              <Button onClick={saveListaNomesRaw} type="button">
                <ClipboardList aria-hidden="true" size={16} />
                Salvar lista
              </Button>
            </div>
          </section>
        </Modal>
      ) : null}

      {observacoesConfirmationValue ? (
        <AlertDialog
          description="As observações foram editadas manualmente. Confirme se deseja substituir o conteúdo atual pelo texto preenchido automaticamente."
          onClose={closeObservacoesConfirmation}
          size="sm"
          title="Substituir observações"
        >
          <section className="confirm-dialog" aria-describedby="observacoes-autofill-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
                <h2 id="observacoes-autofill-title">Substituir observações</h2>
              </div>
            </header>

            <p id="observacoes-autofill-description">
              As observações foram editadas manualmente. Deseja substituir o conteúdo atual pelo texto preenchido automaticamente?
            </p>

            <div className="confirm-dialog__actions">
              <AlertDialogCancel asChild>
                <button className="ui-button ui-button--ghost" type="button">
                  Manter observações atuais
                </button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <button className="ui-button ui-button--primary" onClick={confirmObservacoesAutofill} type="button">
                  Substituir observações
                </button>
              </AlertDialogAction>
            </div>
          </section>
        </AlertDialog>
      ) : null}
      {pendingLegacyImport ? (
        <AlertDialog
          description={`O formulário já possui dados preenchidos. Confirme se deseja descartar o rascunho atual e carregar ${pendingLegacyImport.fileName}.`}
          onClose={cancelPendingLegacyImport}
          size="sm"
          title="Substituir rascunho atual"
        >
          <section className="confirm-dialog" aria-describedby="legacy-import-overwrite-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
                <h2 id="legacy-import-overwrite-title">Substituir rascunho atual</h2>
              </div>
            </header>

            <p id="legacy-import-overwrite-description">
              O formulário já possui dados preenchidos. Deseja descartar o rascunho atual e carregar o conteúdo de
              <strong> {pendingLegacyImport.fileName}</strong>?
            </p>

            <div className="confirm-dialog__actions">
              <AlertDialogCancel asChild>
                <button className="ui-button ui-button--ghost" type="button">
                  Manter rascunho atual
                </button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <button className="ui-button ui-button--primary" onClick={confirmPendingLegacyImport} type="button">
                  Substituir pelo JSON
                </button>
              </AlertDialogAction>
            </div>
          </section>
        </AlertDialog>
      ) : null}
      {pendingNavigationHref ? (
        <AlertDialog
          description="A ficha possui alterações ainda não salvas."
          onClose={closePendingNavigationDialog}
          size="sm"
          title="Sair sem salvar"
        >
          <section className="confirm-dialog" aria-describedby="leave-unsaved-ficha-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
                <h2 id="leave-unsaved-ficha-title">Sair sem salvar</h2>
              </div>
            </header>

            <p id="leave-unsaved-ficha-description">
              A ficha possui alterações ainda não salvas.
            </p>

            <div className="confirm-dialog__actions">
              <AlertDialogCancel asChild>
                <button className="ui-button ui-button--ghost" type="button">
                  Continuar editando
                </button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <button className="ui-button ui-button--danger" onClick={confirmPendingNavigation} type="button">
                  Sair sem salvar
                </button>
              </AlertDialogAction>
            </div>
          </section>
        </AlertDialog>
      ) : null}
    </>
  );
}

function DraftPrintLayer({ ficha, includeRawNameList, onPrinted }: { ficha: FichaDetail; includeRawNameList: boolean; onPrinted: () => void }) {
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
      <PrintFicha ficha={ficha} includeRawNameList={includeRawNameList} />
    </div>,
    document.body,
  );
}

function buildDraftPrintFicha(form: HTMLFormElement, values: FichaFormClientValues): FichaDetail {
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
    observacoes: values.observacoes || null,
    observacoes_html: values.observacoes || null,
    reforco_gola: values.reforcoGola || null,
    status: "pendente",
    updated_at: new Date().toISOString(),
    vendedor: text("vendedor") || null,
  } as FichaDetail;
}

type FieldProps = {
  children: React.ReactNode;
  error?: string;
  full?: boolean;
  label: string;
  name: string;
  required?: boolean;
};

type DatePickerFieldProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  id: string;
  initialValue?: string | null;
  name: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
};

function DeliveryDeadlineAlert({ deliveryDate }: { deliveryDate: string }) {
  const daysRemaining = getDateInputDifferenceInDays(deliveryDate);

  if (!deliveryDate || daysRemaining === null) return null;

  const tone = getDeadlineTone(daysRemaining);
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? CircleAlert : CircleX;
  const message = getDeadlineMessage(daysRemaining, tone);
  const businessDaysRemaining = daysRemaining >= 0 ? getBusinessDaysRemaining(deliveryDate) : null;

  return (
    <div className="delivery-deadline-alert" data-tone={tone} role="status">
      <Icon aria-hidden="true" size={18} />
      <span>
        {message}
        {businessDaysRemaining !== null ? (
          <>
            {" "}
            <strong>({formatBusinessDayCount(businessDaysRemaining)}!)</strong>
          </>
        ) : null}
      </span>
    </div>
  );
}

function getDeadlineTone(daysRemaining: number) {
  if (daysRemaining <= 7) return "danger";
  if (daysRemaining <= 14) return "warning";
  return "success";
}

function getDeadlineMessage(daysRemaining: number, tone: "danger" | "success" | "warning") {
  if (daysRemaining < 0) {
    return `Prazo vencido! Entrega atrasada há ${formatDayCount(Math.abs(daysRemaining))}.`;
  }

  const remaining = formatDayCount(daysRemaining);

  if (tone === "danger") {
    return `Prazo curto! Restam ${remaining} para a entrega desse pedido!`;
  }

  if (tone === "warning") {
    return `Prazo Moderado. Restam ${remaining} para a entrega desse pedido!`;
  }

  return `Restam ${remaining} para a entrega desse pedido!`;
}

function formatDayCount(value: number) {
  return `${value} ${value === 1 ? "dia" : "dias"}`;
}

function formatBusinessDayCount(value: number) {
  return `${value} ${value === 1 ? "dia útil" : "dias úteis"}`;
}

function getBusinessDaysRemaining(target: string) {
  const calendarDays = getDateInputDifferenceInDays(target);
  if (calendarDays === null || calendarDays < 0) return null;

  let businessDays = 0;
  const today = getBusinessTodayInput();

  for (let offset = 1; offset <= calendarDays; offset += 1) {
    const date = createUtcDateFromInput(addDaysToInput(today, offset));
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      businessDays += 1;
    }
  }

  return businessDays;
}

function DatePickerField({
  "aria-describedby": describedBy,
  "aria-invalid": invalid = false,
  id,
  initialValue,
  name,
  onValueChange,
  required = false,
}: DatePickerFieldProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDateValue(value);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    inputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="date-picker" ref={wrapperRef}>
      <input ref={inputRef} name={name} type="hidden" value={value} />
      <button
        id={id}
        aria-describedby={describedBy}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="date-picker__trigger"
        data-invalid={invalid ? "true" : "false"}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CalendarDays aria-hidden="true" size={17} />
        <span data-placeholder={value ? "false" : "true"}>{formatDateLabel(value)}</span>
      </button>
      {isOpen ? (
        <div className="date-picker__popover" role="dialog" aria-label="Selecionar data">
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={(date) => {
              if (!date && required) return;
              const nextValue = formatDateValue(date);
              setValue(nextValue);
              onValueChange?.(nextValue);
              setIsOpen(false);
            }}
            modifiers={{
              weekend: { dayOfWeek: [0, 6] },
            }}
            modifiersClassNames={{
              weekend: "rdp-day--weekend",
            }}
            weekStartsOn={0}
          />
        </div>
      ) : null}
    </div>
  );
}

function Field({ children, error, full = false, label, name, required = false }: FieldProps) {
  return (
    <div className={full ? "field field--full" : "field"}>
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton({ isUploading, label }: { isUploading: boolean; label: string }) {
  const { pending } = useFormStatus();
  const isPending = pending || isUploading;
  const pendingLabel = isUploading
    ? "Enviando imagens..."
    : label === "Salvar alterações"
      ? "Salvando alterações..."
      : "Salvando ficha...";

  return (
    <Button aria-disabled={isPending} disabled={isPending} type="submit">
      {isPending ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={18} />}
      {isPending ? pendingLabel : label}
    </Button>
  );
}

function sumProductQuantities(items: ProductFormItem[]) {
  return items.reduce((total, item) => {
    const quantity = Number.parseInt(String(item.quantidade ?? "").trim(), 10);
    return total + (Number.isFinite(quantity) ? quantity : 0);
  }, 0);
}
