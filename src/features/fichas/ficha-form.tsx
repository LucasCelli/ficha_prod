"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal, flushSync, useFormStatus } from "react-dom";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Bold,
  CalendarDays,
  Cog,
  Copy,
  GripVertical,
  Images,
  Italic,
  List,
  ListOrdered,
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
import { Button, CustomDatalist, Tooltip, type CustomDatalistOption } from "@/components/ui";
import type { CatalogOptionsByKind } from "@/features/catalogos/data";
import { createFichaAction, updateFichaAction } from "./actions";
import type { FichaDetail } from "./data";
import { getInitialFichaFormState } from "./form-state";
import { PrintFicha } from "./print-ficha";
import { PrintTriggerButton } from "./print-trigger-button";

type FichaFormProps = {
  catalogOptions?: CatalogOptionsByKind;
  clienteOptions?: CustomDatalistOption[];
  ficha?: FichaDetail;
  mode?: "create" | "edit";
  vendedorOptions?: CustomDatalistOption[];
};

type ProductFormItem = {
  detalhesProduto: string;
  id: string;
  produto: string;
  quantidade: string;
  tamanho: string;
};

type ImageFormItem = {
  altText: string;
  bytes?: number;
  file?: File;
  height?: number;
  id: string;
  persisted?: boolean;
  previewUrl?: string;
  publicId?: string;
  secureUrl?: string;
  width?: number;
};

type FichaFormClientValues = {
  acabamentoGola: string;
  acabamentoManga: string;
  aberturaLateral: string;
  arte: string;
  comNomes: string;
  composicao: string;
  faixa: string;
  filete: string;
  gola: string;
  imagens: ImageFormItem[];
  itens: ProductFormItem[];
  material: string;
  observacoes: string;
  reforcoGola: string;
  viesRegata: string;
};

const SIZE_ORDER = new Map(
  ["RN", "PP", "P", "M", "G", "GG", "XG", "XGG", "EXG", "G1", "G2", "G3", "G4", "G5"].map((size, index) => [
    size,
    index,
  ]),
);

type RichTextCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "removeFormat";

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

function createEmptyProductItem(id = "item-0"): ProductFormItem {
  return {
    detalhesProduto: "",
    id,
    produto: "",
    quantidade: "1",
    tamanho: "",
  };
}

function getInitialProductItems(ficha?: FichaDetail): ProductFormItem[] {
  if (!ficha?.itens?.length) return [createEmptyProductItem()];

  return ficha.itens.map((item) => ({
    detalhesProduto: item.detalhes_produto ?? item.detalhes ?? "",
    id: item.id,
    produto: item.produto ?? item.descricao ?? "",
    quantidade: String(item.quantidade ?? 1),
    tamanho: item.tamanho ?? "",
  }));
}

function getInitialImageItems(ficha?: FichaDetail): ImageFormItem[] {
  if (!ficha?.imagens?.length) return [];

  return ficha.imagens.map((image) => {
    const dados = image.dados && typeof image.dados === "object" && !Array.isArray(image.dados) ? image.dados : {};
    const publicId = "publicId" in dados && typeof dados.publicId === "string" ? dados.publicId : image.storage_path ?? image.id;

    return {
      altText: image.alt_text ?? "",
      bytes: image.bytes ?? undefined,
      height: image.height ?? undefined,
      id: image.id,
      persisted: true,
      publicId,
      secureUrl: image.url,
      width: image.width ?? undefined,
    };
  });
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

function getSizeOrder(value: string) {
  const normalized = value.trim().toUpperCase();
  return SIZE_ORDER.get(normalized) ?? 1000;
}

function getImageCardWidthFromGrid(gridWidth: number, count: number) {
  const gap = 14;
  if (count <= 1) return Math.max(240, Math.floor((gridWidth - gap) / 2));
  if (count === 2) return Math.max(220, Math.floor((gridWidth - gap) / 2));
  if (count === 3) return Math.max(200, Math.floor((gridWidth - gap * 2) / 3));
  return Math.max(180, Math.floor((gridWidth - gap * 3) / 4));
}

function parseDateValue(value?: string | null) {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
}

function formatDateValue(date?: Date) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const date = parseDateValue(value);
  if (!date) return "Selecionar data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

function isAcabamentoMangaComExtras(value: string) {
  const normalized = normalizeProductForRule(value);
  return ["punho", "vies", "punho de ribana", "punho sublimado", "vies sublimado"].some((item) =>
    normalized.includes(item),
  );
}

function getDescricaoAcabamentoManga(value: string) {
  const normalized = normalizeProductForRule(value);
  if (normalized.includes("punho") && normalized.includes("sublimado")) return "PUNHO SUBLIMADO";
  if (normalized.includes("punho")) return "PUNHO DE RIBANA";
  if (normalized.includes("vies") && normalized.includes("sublimado")) return "VIÉS SUBLIMADO";
  if (normalized.includes("vies")) return "VIÉS";
  return value.toUpperCase();
}

function marcadorComNomesPorValor(value: string) {
  if (value === "1") return "COM NOMES";
  if (value === "2") return "COM NOMES E NÚMEROS";
  if (value === "3") return "SOMENTE NÚMEROS";
  return "";
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

export function FichaForm({ catalogOptions, clienteOptions = [], ficha, mode = "create", vendedorOptions = [] }: FichaFormProps) {
  const action = mode === "edit" ? updateFichaAction : createFichaAction;
  const [state, formAction] = useActionState(action, getInitialFichaFormState());
  const formRef = useRef<HTMLFormElement>(null);
  const imageGridRef = useRef<HTMLDivElement | null>(null);
  const imagensRef = useRef<ImageFormItem[]>([]);
  const lastToastMessageRef = useRef<string | null>(null);
  const lastObservacoesAutofillRef = useRef("");
  const observacoesEditorRef = useRef<HTMLDivElement>(null);
  const observacoesAutoBlockedRef = useRef(Boolean(ficha?.observacoes?.trim()));
  const applyingObservacoesAutoRef = useRef(false);
  const applyingObservacoesAutoTimerRef = useRef<number | null>(null);
  const submitAfterUploadRef = useRef(false);
  const sortFeedbackTimerRef = useRef<number | null>(null);
  const autoGolaRef = useRef(false);
  const autoMaterialRef = useRef(false);
  const autoComposicaoRef = useRef(false);
  const fichaForm = useForm<FichaFormClientValues>({
    defaultValues: {
      acabamentoGola: ficha?.acabamento_gola ?? "",
      acabamentoManga: ficha?.acabamento_manga ?? "",
      aberturaLateral: ficha?.abertura_lateral ?? "nao",
      arte: ficha?.arte ?? "",
      comNomes: ficha?.com_nomes?.toString() ?? "",
      composicao: ficha?.composicao ?? "",
      faixa: ficha?.faixa ?? "nao",
      filete: ficha?.filete ?? "nao",
      gola: ficha?.gola ?? "",
      imagens: getInitialImageItems(ficha),
      itens: getInitialProductItems(ficha),
      material: ficha?.material ?? "",
      observacoes: ficha?.observacoes ?? "",
      reforcoGola: ficha?.reforco_gola ?? "nao",
      viesRegata: ficha?.acabamento_manga === "vies" ? "sim" : "",
    },
  });
  const { control, getValues, setValue } = fichaForm;
  const {
    append: appendProductItem,
    move: moveProductItem,
    replace: replaceProductItems,
    remove: removeProductItemAt,
  } = useFieldArray({
    control,
    keyName: "fieldId",
    name: "itens",
  });
  const {
    append: appendImageItem,
    move: moveImageItem,
    remove: removeImageItemAt,
    replace: replaceImageItems,
    update: updateImageItem,
  } = useFieldArray({
    control,
    keyName: "fieldId",
    name: "imagens",
  });
  const [gola, material, composicao, acabamentoGola, acabamentoManga, reforcoGola, aberturaLateral, filete, faixa, viesRegata, arte, comNomes, observacoes, itens, imagens] =
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
        "observacoes",
        "itens",
        "imagens",
      ],
    });
  const [imageGridWidth, setImageGridWidth] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [draftPrintFicha, setDraftPrintFicha] = useState<FichaDetail | null>(null);
  const [sortFeedbackVisible, setSortFeedbackVisible] = useState(false);
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

    appendImageItem(localImages);
  }, [appendImageItem, imagens.length]);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submitAfterUploadRef.current) {
      submitAfterUploadRef.current = false;
      return;
    }

    const hasPendingImages = imagens.some((image) => image.file);

    if (!hasPendingImages) return;
    if (shouldLetServerValidateBeforeUpload(new FormData(event.currentTarget))) return;

    event.preventDefault();
    setIsUploadingImage(true);

    try {
      const uploadedImages: ImageFormItem[] = [];

      for (const image of imagens) {
        uploadedImages.push(await uploadImageToCloudinary(image));
      }

      flushSync(() => {
        replaceImageItems(uploadedImages);
      });
      submitAfterUploadRef.current = true;
      formRef.current?.requestSubmit();
    } catch (error) {
      toast.error("Erro no upload", {
        description: error instanceof Error ? error.message : "Falha ao enviar imagens.",
      });
    } finally {
      setIsUploadingImage(false);
    }
  }

  useEffect(() => {
    if (state.status !== "error") return;

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
    imagensRef.current = imagens;
  }, [imagens]);

  useEffect(() => {
    const grid = imageGridRef.current;
    if (!grid) return;

    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      setImageGridWidth((current) => (width > 0 && width !== current ? width : current));
    });

    observer.observe(grid);

    return () => observer.disconnect();
  }, [imagens]);

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
    return () => {
      imagensRef.current.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      if (sortFeedbackTimerRef.current) {
        window.clearTimeout(sortFeedbackTimerRef.current);
      }
      if (applyingObservacoesAutoTimerRef.current) {
        window.clearTimeout(applyingObservacoesAutoTimerRef.current);
      }
    };
  }, []);

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
    const itemIndex = getValues("itens").findIndex((item) => item.id === id);
    if (itemIndex >= 0) {
      setValue(`itens.${itemIndex}.${field}`, value, { shouldDirty: true });
    }
  }

  function addProductItem() {
    appendProductItem(createEmptyProductItem(`item-${Date.now()}-${getValues("itens").length}`));
  }

  function duplicateProductItem(id: string) {
    const current = getValues("itens");
    const item = current.find((candidate) => candidate.id === id);
    if (!item) return;

    appendProductItem({ ...item, id: `item-${Date.now()}-${current.length}` });
  }

  function removeProductItem(id: string) {
    const current = getValues("itens");
    const itemIndex = current.findIndex((item) => item.id === id);

    if (current.length > 1 && itemIndex >= 0) {
      removeProductItemAt(itemIndex);
      return;
    }

    setValue("itens", [createEmptyProductItem()], { shouldDirty: true });
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
      const bySize = getSizeOrder(a.tamanho) - getSizeOrder(b.tamanho);
      if (bySize !== 0) return bySize;
      return a.produto.localeCompare(b.produto, "pt-BR", { sensitivity: "base" });
    });

    showProductSortFeedback();
    replaceProductItems(sortedItems);
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source } = result;

    if (!destination || destination.index === source.index) return;

    if (source.droppableId === "ficha-products" && destination.droppableId === "ficha-products") {
      moveProductItem(source.index, destination.index);
    }

    if (source.droppableId === "ficha-images" && destination.droppableId === "ficha-images") {
      moveImageItem(source.index, destination.index);
    }
  }

  function applyRichTextCommand(command: RichTextCommand) {
    observacoesEditorRef.current?.focus();
    document.execCommand(command);
    setValue("observacoes", observacoesEditorRef.current?.innerHTML ?? "", { shouldDirty: true });
  }

  function handleObservacoesInput() {
    const nextHtml = observacoesEditorRef.current?.innerHTML ?? "";
    const nextText = normalizeObservationComparison(nextHtml);
    const lastText = normalizeObservationComparison(lastObservacoesAutofillRef.current);

    if (!applyingObservacoesAutoRef.current && nextText && nextText !== lastText) {
      observacoesAutoBlockedRef.current = true;
    }
    setValue("observacoes", nextHtml, { shouldDirty: true });
  }

  function handleObservacoesPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData("text/plain");

    if (!text) return;

    event.preventDefault();
    document.execCommand("insertText", false, text);
    observacoesAutoBlockedRef.current = true;
    setValue("observacoes", observacoesEditorRef.current?.innerHTML ?? "", { shouldDirty: true });
  }

  function buildObservacoesAutofill() {
    const form = formRef.current;
    const produtoPrincipal = itens.find((item) => item.produto.trim());
    const produto = produtoPrincipal?.produto.trim() ?? "";
    const corMaterial = getControlLabel(form, "corMaterial");
    const manga = getControlLabel(form, "manga");
    const bolso = getControlLabel(form, "bolso");
    const arte = getFormText(form, "arte");
    const arteLabel = getControlLabel(form, "arte");
    const partes: string[] = [];

    if (produto) {
      partes.push(produto);
    }

    if (material || corMaterial) {
      const detalhes = [material];
      const corLower = normalizeProductForRule(corMaterial);
      if (corMaterial && corLower !== "sublimacao" && corLower !== "sublimado") {
        detalhes.push(corMaterial);
      }
      partes.push(["TECIDO", ...detalhes.filter(Boolean)].join(" ").trim());
    }

    if (manga) {
      const detalhes = [manga];
      const larguraManga = getControlLabel(form, "larguraManga");
      const corAcabManga = getControlLabel(form, "corAcabamentoManga");

      if (isAcabamentoMangaComExtras(acabamentoMangaValue)) {
        const tipo = getDescricaoAcabamentoManga(acabamentoMangaValue);
        detalhes.push(["COM", tipo, larguraManga, corAcabManga].filter(Boolean).join(" "));
      } else if (acabamentoMangaValue) {
        detalhes.push(`EM ${acabamentoMangaValue}`);
      }

      partes.push(`MANGA ${detalhes.join(", ")}`);
    }

    if (gola) {
      const detalhes = [gola];
      const corGola = getControlLabel(form, "corGola");
      const larguraGola = getControlLabel(form, "larguraGola");
      const corBotao = getControlLabel(form, "corBotao");
      const normalizedGolaValue = normalizeProductForRule(gola);

      if (!normalizedGolaValue.includes("polo") && !normalizedGolaValue.includes("social") && acabamentoGola) {
        detalhes.push(["EM", acabamentoGola, larguraGola].filter(Boolean).join(" "));
        if (corGola) detalhes.push(corGola);
      } else if (normalizedGolaValue.includes("polo")) {
        if (corGola) detalhes.push(corGola);

        const corPeitilhoInterno = getControlLabel(form, "corPeitilhoInterno");
        const corPeitilhoExterno = getControlLabel(form, "corPeitilhoExterno");
        if (corPeitilhoInterno && corPeitilhoExterno) {
          detalhes.push(`PEITILHO INTERNO ${corPeitilhoInterno} E EXTERNO ${corPeitilhoExterno}`);
        } else if (corPeitilhoInterno) {
          detalhes.push(`PEITILHO INTERNO ${corPeitilhoInterno}`);
        } else if (corPeitilhoExterno) {
          detalhes.push(`PEITILHO EXTERNO ${corPeitilhoExterno}`);
        }

        if (corBotao) detalhes.push(`BOTÃO ${corBotao}`);

        if (aberturaLateral === "sim") {
          const corAbertura = getControlLabel(form, "corAberturaLateral");
          detalhes.push(["COM ABERTURA LATERAL", corAbertura].filter(Boolean).join(" "));
        }
      } else if (normalizedGolaValue.includes("social")) {
        const corPeDeGolaInterno = getControlLabel(form, "corPeDeGolaInterno");
        const corPeDeGolaExterno = getControlLabel(form, "corPeDeGolaExterno");
        if (corPeDeGolaInterno && corPeDeGolaExterno) {
          detalhes.push(`PÉ DE GOLA INTERNO ${corPeDeGolaInterno} E EXTERNO ${corPeDeGolaExterno}`);
        } else if (corPeDeGolaInterno) {
          detalhes.push(`PÉ DE GOLA INTERNO ${corPeDeGolaInterno}`);
        } else if (corPeDeGolaExterno) {
          detalhes.push(`PÉ DE GOLA EXTERNO ${corPeDeGolaExterno}`);
        }
        if (corBotao) detalhes.push(`BOTÃO ${corBotao}`);
      }

      if (reforcoGola === "sim") {
        const corReforco = getControlLabel(form, "corReforco");
        detalhes.push(["COM REFORÇO", corReforco].filter(Boolean).join(" "));
      }

      partes.push(detalhes.join(", "));
    }

    if (bolso && normalizeProductForRule(bolso) !== "sem bolso") partes.push(`COM ${bolso}`);

    if (filete === "sim") {
      partes.push(["FILETE", getControlLabel(form, "fileteLocal"), getControlLabel(form, "fileteCor")]
        .filter(Boolean)
        .join(", "));
    }

    if (faixa === "sim") {
      partes.push(["FAIXA REFLETIVA", getControlLabel(form, "faixaLocal"), getControlLabel(form, "faixaCor")]
        .filter(Boolean)
        .join(", "));
    }

    if (arte) {
      partes.push(arte === "sem_personalizacao" ? "SEM PERSONALIZAÇÃO" : `PERSONALIZADO EM ${arteLabel || arte}`);
    }

    const marcadorComNomes = marcadorComNomesPorValor(comNomes || getFormText(form, "comNomes"));
    if (marcadorComNomes) partes.push(marcadorComNomes);

    return partes.length > 0 ? partes.join(" / ").toUpperCase() : "";
  }

  function setGeneratedObservacoes(nextObservacoes: string) {
    if (applyingObservacoesAutoTimerRef.current) {
      window.clearTimeout(applyingObservacoesAutoTimerRef.current);
    }

    applyingObservacoesAutoRef.current = true;
    lastObservacoesAutofillRef.current = nextObservacoes;
    setValue("observacoes", nextObservacoes, { shouldDirty: true });
    if (observacoesEditorRef.current && observacoesEditorRef.current.innerHTML !== nextObservacoes) {
      observacoesEditorRef.current.innerHTML = nextObservacoes;
    }

    applyingObservacoesAutoTimerRef.current = window.setTimeout(() => {
      applyingObservacoesAutoRef.current = false;
      applyingObservacoesAutoTimerRef.current = null;
    }, 0);
  }

  function updateObservacoesAutofill(options: { force?: boolean; notifyEmpty?: boolean; requireConfirmation?: boolean } = {}) {
    const nextObservacoes = buildObservacoesAutofill();
    const currentText = normalizeObservationComparison(observacoes);
    const lastText = normalizeObservationComparison(lastObservacoesAutofillRef.current);
    const nextText = normalizeObservationComparison(nextObservacoes);
    const isManualText = Boolean(currentText) && currentText !== lastText && currentText !== nextText;

    if (!nextObservacoes) {
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

    if (options.requireConfirmation && isManualText && !window.confirm("Substituir as observações preenchidas manualmente?")) {
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

  function handleFormRealtimeObservacoes(event: React.FormEvent<HTMLFormElement>) {
    if (event.target === observacoesEditorRef.current) return;
    window.setTimeout(() => updateObservacoesAutofill(), 0);
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
  const serializedImages = JSON.stringify(
    imagens
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
  const lockedImageCardWidth = imageGridWidth ? getImageCardWidthFromGrid(imageGridWidth, imagens.length) : null;

  useEffect(() => {
    updateObservacoesAutofill();
  });

  return (
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
      <input name="imagensJson" type="hidden" value={serializedImages} />
      <input name="itensJson" type="hidden" value={serializedItems} />
      {state.message ? (
        <div className="form-banner" role="alert">
          {state.message}
        </div>
      ) : null}

      <DragDropContext onDragEnd={handleDragEnd}>
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
              defaultValue={ficha?.cliente_nome_snapshot}
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
              defaultValue={ficha?.cliente_auxiliar ?? undefined}
              placeholder="Local, detalhe, cor…"
            />
          </Field>

          <Field label="Vendedor" name="vendedor" error={state.fieldErrors?.vendedor} required>
            <CustomDatalist
              id="vendedor"
              name="vendedor"
              aria-describedby={state.fieldErrors?.vendedor ? "vendedor-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.vendedor)}
              defaultValue={ficha?.vendedor ?? undefined}
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
              initialValue={ficha?.data_inicio}
            />
          </Field>

          <Field label="Data de Entrega" name="dataEntrega" error={state.fieldErrors?.dataEntrega} required>
            <DatePickerField
              id="dataEntrega"
              name="dataEntrega"
              aria-describedby={state.fieldErrors?.dataEntrega ? "dataEntrega-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.dataEntrega)}
              initialValue={ficha?.data_entrega}
              required
            />
          </Field>

          <Field label="Número da Venda" name="numeroVenda" error={state.fieldErrors?.numeroVenda}>
            <input
              id="numeroVenda"
              name="numeroVenda"
              aria-describedby={state.fieldErrors?.numeroVenda ? "numeroVenda-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.numeroVenda)}
              defaultValue={ficha?.numero_venda ?? undefined}
              inputMode="numeric"
              placeholder="Número da venda…"
            />
          </Field>

          <label className="checkbox-field checkbox-field--aligned">
            <input defaultChecked={ficha?.evento} name="evento" type="checkbox" />
            <span>Pedido para evento?</span>
          </label>
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
            <Droppable droppableId="ficha-products">
              {(dropProvided, dropSnapshot) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className="products-editor__list"
                  data-over={dropSnapshot.isDraggingOver ? "true" : "false"}
                  data-sorted={sortFeedbackVisible ? "true" : "false"}
                >
                  {itens.map((item, index) => (
                    <Draggable draggableId={item.id} index={index} key={item.id}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="products-editor__row"
                          data-dragging={dragSnapshot.isDragging ? "true" : "false"}
                        >
                <span
                  aria-label={`Reordenar produto ${index + 1}`}
                  className="products-editor__drag"
                  role="button"
                  {...dragProvided.dragHandleProps}
                >
                  <GripVertical aria-hidden="true" size={16} />
                </span>
                <div className="products-editor__cell">
                  <span>Tam.</span>
                  <CustomDatalist
                    aria-label={`Tamanho do produto ${index + 1}`}
                    id={`tamanho-${item.id}`}
                    inputMode="text"
                    onValueChange={(value) => updateProductItem(item.id, "tamanho", value)}
                    options={sizeOptions}
                    placeholder="Tam."
                    value={item.tamanho ?? ""}
                  />
                </div>
                <label className="products-editor__cell">
                  <span>Qtd.</span>
                  <input
                    aria-label={`Quantidade do produto ${index + 1}`}
                    inputMode="numeric"
                    onChange={(event) => updateProductItem(item.id, "quantidade", event.currentTarget.value)}
                    placeholder="Qtd."
                    value={item.quantidade ?? ""}
                  />
                </label>
                <div className="products-editor__cell">
                  <span>Produto</span>
                  <CustomDatalist
                    aria-invalid={Boolean(state.fieldErrors?.itensJson)}
                    aria-label={`Produto ${index + 1}`}
                    id={`produto-${item.id}`}
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
                    onChange={(event) => updateProductItem(item.id, "detalhesProduto", event.currentTarget.value)}
                    placeholder="Opcional…"
                    value={item.detalhesProduto ?? ""}
                  />
                </label>
                <div className="products-editor__actions">
                  <Tooltip label="Copiar produto">
                    <button aria-label={`Duplicar produto ${index + 1}`} onClick={() => duplicateProductItem(item.id)} type="button">
                      <Copy aria-hidden="true" size={16} />
                    </button>
                  </Tooltip>
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
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
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
              defaultValue={ficha?.cor_material ?? undefined}
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
                  defaultValue={ficha?.manga ?? undefined}
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
                  defaultValue={ficha?.largura_manga ?? undefined}
                  placeholder="Ex: 3,5…"
                />
              </Field>
              <Field label="Cor do acabamento" name="corAcabamentoManga" error={state.fieldErrors?.corAcabamentoManga}>
                <CustomDatalist
                  id="corAcabamentoManga"
                  name="corAcabamentoManga"
                  aria-describedby={state.fieldErrors?.corAcabamentoManga ? "corAcabamentoManga-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.corAcabamentoManga)}
                  defaultValue={ficha?.cor_acabamento_manga ?? undefined}
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
                defaultValue={ficha?.cor_gola ?? undefined}
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
                defaultValue={ficha?.largura_gola ?? undefined}
                placeholder="Ex: 2,5…"
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
                defaultValue={ficha?.cor_reforco ?? undefined}
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
                  defaultValue={ficha?.cor_peitilho_interno ?? undefined}
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
                  defaultValue={ficha?.cor_peitilho_externo ?? undefined}
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
                defaultValue={ficha?.cor_botao ?? undefined}
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
                  defaultValue={ficha?.cor_pe_de_gola_interno ?? undefined}
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
                  defaultValue={ficha?.cor_pe_de_gola_externo ?? undefined}
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
                defaultValue={ficha?.cor_abertura_lateral ?? undefined}
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
              defaultValue={ficha?.bolso ?? undefined}
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
                  defaultValue={ficha?.filete_local ?? undefined}
                  placeholder="Manga, lateral…"
                />
              </Field>
              <Field label="Cor do filete" name="fileteCor" error={state.fieldErrors?.fileteCor}>
                <CustomDatalist
                  id="fileteCor"
                  name="fileteCor"
                  aria-describedby={state.fieldErrors?.fileteCor ? "fileteCor-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.fileteCor)}
                  defaultValue={ficha?.filete_cor ?? undefined}
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
                  defaultValue={ficha?.faixa_local ?? undefined}
                  placeholder="Manga, costas…"
                />
              </Field>
              <Field label="Cor da faixa" name="faixaCor" error={state.fieldErrors?.faixaCor}>
                <CustomDatalist
                  id="faixaCor"
                  name="faixaCor"
                  aria-describedby={state.fieldErrors?.faixaCor ? "faixaCor-error" : undefined}
                  aria-invalid={Boolean(state.fieldErrors?.faixaCor)}
                  defaultValue={ficha?.faixa_cor ?? undefined}
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
                defaultValue={ficha?.cor_sublimacao ?? undefined}
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
          </div>
          <div className="form-subsection form-subsection--single">
            <h3>Observações</h3>
          <Field label="Observações" name="observacoes" error={state.fieldErrors?.observacoes} full>
            <input name="observacoes" type="hidden" value={observacoes} />
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
              <div
                id="observacoes"
                aria-describedby={state.fieldErrors?.observacoes ? "observacoes-error" : undefined}
                aria-invalid={Boolean(state.fieldErrors?.observacoes)}
                className="rich-editor__surface"
                contentEditable
                data-empty={getPlainTextFromHtml(observacoes) ? "false" : "true"}
                dangerouslySetInnerHTML={{ __html: observacoes }}
                onInput={handleObservacoesInput}
                onPaste={handleObservacoesPaste}
                ref={observacoesEditorRef}
                role="textbox"
                suppressContentEditableWarning
                tabIndex={0}
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
              <Droppable direction="horizontal" droppableId="ficha-images">
                {(dropProvided, dropSnapshot) => (
              <div
                ref={(node) => {
                  dropProvided.innerRef(node);
                  imageGridRef.current = node;
                }}
                {...dropProvided.droppableProps}
                className="image-upload-grid"
                data-count={imagens.length}
                data-over={dropSnapshot.isDraggingOver ? "true" : "false"}
              >
                {imagens.map((image, index) => (
                  <Draggable draggableId={image.id} index={index} key={image.id}>
                    {(dragProvided, dragSnapshot) => (
                  <article
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className="image-upload-card"
                    data-image-id={image.id}
                    data-dragging={dragSnapshot.isDragging ? "true" : "false"}
                    style={{
                      ...dragProvided.draggableProps.style,
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
                      {image.file ? <span className="image-upload-card__badge">Pendente</span> : <span aria-hidden="true" />}
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
                        }}
                        onTouchStart={(event) => event.stopPropagation()}
                        placeholder="Ex: frente, costas, detalhe do bordado"
                        value={image.altText}
                      />
                    </label>
                  </article>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
                )}
              </Droppable>
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
      </DragDropContext>

      <div className="form-actions">
        {mode === "edit" && ficha?.id ? (
          <PrintTriggerButton className="ui-button ui-button--secondary" href={`/fichas/${ficha.id}/imprimir`} label={`Imprimir ficha ${ficha.cliente_nome_snapshot}`}>
            <Printer aria-hidden="true" size={18} />
            Imprimir ficha
          </PrintTriggerButton>
        ) : (
          <button
            aria-label="Imprimir rascunho da ficha"
            className="ui-button ui-button--secondary"
            onClick={handleDraftPrint}
            type="button"
          >
            <Printer aria-hidden="true" size={18} />
            Imprimir ficha
          </button>
        )}
        <SubmitButton isUploading={isUploadingImage} label={mode === "edit" ? "Salvar alterações" : "Salvar ficha"} />
      </div>
      {draftPrintFicha ? <DraftPrintLayer ficha={draftPrintFicha} onPrinted={() => setDraftPrintFicha(null)} /> : null}
    </form>
  );
}

function DraftPrintLayer({ ficha, onPrinted }: { ficha: FichaDetail; onPrinted: () => void }) {
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
      <PrintFicha ficha={ficha} />
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
    cliente_nome_snapshot: text("cliente") || "Ficha sem cliente",
    com_nomes: values.comNomes ? Number(values.comNomes) : null,
    composicao: values.composicao || null,
    cor_abertura_lateral: text("corAberturaLateral") || null,
    cor_acabamento_manga: text("corAcabamentoManga") || null,
    cor_botao: text("corBotao") || null,
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
  required?: boolean;
};

function DatePickerField({
  "aria-describedby": describedBy,
  "aria-invalid": invalid = false,
  id,
  initialValue,
  name,
  required = false,
}: DatePickerFieldProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDateValue(value);

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
      <input name={name} type="hidden" value={value} />
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
              setValue(formatDateValue(date));
              setIsOpen(false);
            }}
            weekStartsOn={1}
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

  return (
    <Button aria-disabled={isPending} disabled={isPending} type="submit">
      {isPending ? <span className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" size={18} />}
      {label}
    </Button>
  );
}
