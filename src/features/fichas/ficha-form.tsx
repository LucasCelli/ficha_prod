"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";
import { Cog, Copy, Images, PackageOpen, Plus, Save, Trash2, Upload, UserRound } from "lucide-react";
import { Button, CustomDatalist, type CustomDatalistOption, useToast } from "@/components/ui";
import type { CatalogOptionsByKind } from "@/features/catalogos/data";
import { createFichaAction, updateFichaAction } from "./actions";
import type { FichaDetail } from "./data";
import { getInitialFichaFormState } from "./form-state";

type FichaFormProps = {
  catalogOptions?: CatalogOptionsByKind;
  ficha?: FichaDetail;
  mode?: "create" | "edit";
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
  return catalogOptions?.[kind]?.length ? catalogOptions[kind] : FALLBACK_CATALOG_OPTIONS[kind];
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

export function FichaForm({ catalogOptions, ficha, mode = "create" }: FichaFormProps) {
  const action = mode === "edit" ? updateFichaAction : createFichaAction;
  const [state, formAction] = useActionState(action, getInitialFichaFormState());
  const { show } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const imagensRef = useRef<ImageFormItem[]>([]);
  const lastToastMessageRef = useRef<string | null>(null);
  const submitAfterUploadRef = useRef(false);
  const autoGolaRef = useRef(false);
  const autoMaterialRef = useRef(false);
  const autoComposicaoRef = useRef(false);
  const [gola, setGola] = useState(ficha?.gola ?? "");
  const [material, setMaterial] = useState(ficha?.material ?? "");
  const [composicao, setComposicao] = useState(ficha?.composicao ?? "");
  const [acabamentoGola, setAcabamentoGola] = useState(ficha?.acabamento_gola ?? "");
  const [acabamentoManga, setAcabamentoManga] = useState(ficha?.acabamento_manga ?? "");
  const [reforcoGola, setReforcoGola] = useState(ficha?.reforco_gola ?? "nao");
  const [aberturaLateral, setAberturaLateral] = useState(ficha?.abertura_lateral ?? "nao");
  const [filete, setFilete] = useState(ficha?.filete ?? "nao");
  const [faixa, setFaixa] = useState(ficha?.faixa ?? "nao");
  const [viesRegata, setViesRegata] = useState(ficha?.acabamento_manga === "vies" ? "sim" : "");
  const [itens, setItens] = useState<ProductFormItem[]>(() => {
    if (!ficha?.itens?.length) return [createEmptyProductItem()];

    return ficha.itens.map((item) => ({
      detalhesProduto: item.detalhes_produto ?? item.detalhes ?? "",
      id: item.id,
      produto: item.produto ?? item.descricao ?? "",
      quantidade: String(item.quantidade ?? 1),
      tamanho: item.tamanho ?? "",
    }));
  });
  const [imagens, setImagens] = useState<ImageFormItem[]>(() => {
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
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
  const primeiroProduto = itens.find((item) => item.produto.trim())?.produto ?? "";

  function syncComposicaoByMaterial(nextMaterial: string, source: "auto" | "manual", compositionOverride?: string) {
    const materialOption = MATERIAL_OPTIONS.find((option) => option.nome === nextMaterial);
    const nextComposition = compositionOverride ?? materialOption?.composicao;

    if (nextComposition) {
      setComposicao(nextComposition);
      autoComposicaoRef.current = true;
      return;
    }

    if (source === "manual" || autoComposicaoRef.current) {
      setComposicao("");
      autoComposicaoRef.current = source === "auto";
    }
  }

  function handleMaterialChange(value: string, option?: CustomDatalistOption) {
    autoMaterialRef.current = false;
    setMaterial(value);
    syncComposicaoByMaterial(value, "manual", option?.metadata?.composition);
  }

  async function uploadImageToCloudinary(image: ImageFormItem): Promise<ImageFormItem> {
    if (!image.file) return image;

    const signatureResponse = await fetch("/api/cloudinary/signature", {
      body: JSON.stringify({
        context: `alt=${image.altText}`,
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
    uploadData.append("context", `alt=${image.altText}`);
    uploadData.append("tags", "ficha_prod,next");

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`, {
      body: uploadData,
      method: "POST",
    });

    if (!uploadResponse.ok) {
      throw new Error(`Falha ao enviar ${image.altText}.`);
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

  function handleImageSelection(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
    const availableSlots = 4 - imagens.length;
    const filesToAdd = selectedFiles.slice(0, availableSlots);

    if (selectedFiles.length === 0) {
      show({
        message: "Selecione arquivos de imagem para adicionar.",
        title: "Imagem inválida",
        type: "warning",
      });
      return;
    }

    if (availableSlots <= 0) {
      show({
        message: "A ficha aceita no máximo 4 imagens.",
        title: "Limite atingido",
        type: "warning",
      });
      return;
    }

    if (selectedFiles.length > filesToAdd.length) {
      show({
        message: "Apenas as primeiras imagens dentro do limite serão adicionadas.",
        title: "Limite de imagens",
        type: "info",
      });
    }

    const localImages = filesToAdd.map((file) => ({
      altText: file.name,
      file,
      id: `local-${Date.now()}-${file.name}`,
      previewUrl: URL.createObjectURL(file),
    }));

    setImagens((current) => [...current, ...localImages]);
  }

  async function handleRemoveImage(image: ImageFormItem) {
    setImagens((current) => current.filter((item) => item.id !== image.id));

    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }

    if (image.persisted) {
      show({
        message: "A imagem será removida da ficha ao salvar as alterações.",
        title: "Imagem removida da ficha",
        type: "info",
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
      show({
        message: "A referência foi removida, mas não foi possível excluir o arquivo agora.",
        title: "Imagem removida",
        type: "warning",
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
        setImagens(uploadedImages);
      });
      submitAfterUploadRef.current = true;
      formRef.current?.requestSubmit();
    } catch (error) {
      show({
        message: error instanceof Error ? error.message : "Falha ao enviar imagens.",
        title: "Erro no upload",
        type: "error",
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
        show({
          id: "ficha-form-error",
          message,
          title: "Pendência na ficha",
          type: "error",
        });
      }, 0);
      lastToastMessageRef.current = message;
    }

    const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    firstInvalid?.focus();
  }, [show, state]);

  useEffect(() => {
    imagensRef.current = imagens;
  }, [imagens]);

  useEffect(() => {
    return () => {
      imagensRef.current.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    const produtoNormalizado = normalizeProductForRule(primeiroProduto);

    if (!produtoNormalizado) {
      if (autoGolaRef.current) {
        setGola("");
        autoGolaRef.current = false;
      }

      if (autoMaterialRef.current) {
        setMaterial("");
        autoMaterialRef.current = false;
        if (autoComposicaoRef.current) {
          setComposicao("");
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
      setGola(golaAutomatica);
      autoGolaRef.current = true;
    } else if (!golaAutomatica && autoGolaRef.current && gola) {
      setGola("");
      autoGolaRef.current = false;
    }

    const materialAutomatico =
      produtoNormalizado === HELANCA_PRODUCT ? "Helanca" : BRIM_PRODUCTS.has(produtoNormalizado) ? "Brim" : "";

    if (materialAutomatico && (!material.trim() || autoMaterialRef.current)) {
      const materialOption = findOptionByName(materialOptions, materialAutomatico);
      const materialValue = materialOption?.value ?? materialOption?.label ?? materialAutomatico;
      setMaterial(materialValue);
      autoMaterialRef.current = true;
      syncComposicaoByMaterial(materialValue, "auto", materialOption?.metadata?.composition);
    } else if (!materialAutomatico && autoMaterialRef.current && material.trim()) {
      setMaterial("");
      autoMaterialRef.current = false;
      if (autoComposicaoRef.current) {
        setComposicao("");
        autoComposicaoRef.current = false;
      }
    }
  }, [gola, golaOptions, material, materialOptions, primeiroProduto]);

  function updateProductItem(id: string, field: keyof Omit<ProductFormItem, "id">, value: string) {
    setItens((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addProductItem() {
    setItens((current) => [...current, createEmptyProductItem(`item-${Date.now()}-${current.length}`)]);
  }

  function duplicateProductItem(id: string) {
    setItens((current) => {
      const item = current.find((candidate) => candidate.id === id);
      if (!item) return current;

      return [...current, { ...item, id: `item-${Date.now()}-${current.length}` }];
    });
  }

  function removeProductItem(id: string) {
    setItens((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : [createEmptyProductItem()]));
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

  return (
    <form ref={formRef} className="ficha-form" action={formAction} noValidate onSubmit={handleSubmit}>
      {ficha ? <input name="id" type="hidden" value={ficha.id} /> : null}
      <input name="imagensJson" type="hidden" value={serializedImages} />
      <input name="itensJson" type="hidden" value={serializedItems} />
      {state.message ? (
        <div className="form-banner" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="form-grid">
        <fieldset className="form-section form-section--customer">
          <legend>
            <UserRound aria-hidden="true" size={18} />
            <span>Informações do Cliente</span>
          </legend>
          <Field label="Nome do Cliente" name="cliente" error={state.fieldErrors?.cliente} required>
            <input
              id="cliente"
              name="cliente"
              aria-describedby={state.fieldErrors?.cliente ? "cliente-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.cliente)}
              autoComplete="organization"
              defaultValue={ficha?.cliente_nome_snapshot}
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
            <input
              id="vendedor"
              name="vendedor"
              aria-describedby={state.fieldErrors?.vendedor ? "vendedor-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.vendedor)}
              autoComplete="name"
              defaultValue={ficha?.vendedor ?? undefined}
              list="vendedoresList"
              placeholder="Digite o vendedor…"
            />
            <datalist id="vendedoresList">
              <option value="Fernanda" />
              <option value="Kemilly" />
              <option value="Priscilla" />
              <option value="Biagi" />
            </datalist>
          </Field>

          <Field label="Data de Início" name="dataInicio" error={state.fieldErrors?.dataInicio}>
            <input
              id="dataInicio"
              name="dataInicio"
              aria-describedby={state.fieldErrors?.dataInicio ? "dataInicio-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.dataInicio)}
              defaultValue={ficha?.data_inicio ?? undefined}
              type="date"
            />
          </Field>

          <Field label="Data de Entrega" name="dataEntrega" error={state.fieldErrors?.dataEntrega} required>
            <input
              id="dataEntrega"
              name="dataEntrega"
              aria-describedby={state.fieldErrors?.dataEntrega ? "dataEntrega-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.dataEntrega)}
              defaultValue={ficha?.data_entrega}
              type="date"
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
            <div className="products-editor__head" aria-hidden="true">
              <span>Tam.</span>
              <span>Qtd.</span>
              <span>Produto</span>
              <span>Detalhes</span>
              <span>Ações</span>
            </div>
            {itens.map((item, index) => (
              <div className="products-editor__row" key={item.id}>
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
                  <button aria-label={`Duplicar produto ${index + 1}`} onClick={() => duplicateProductItem(item.id)} type="button">
                    <Copy aria-hidden="true" size={16} />
                  </button>
                  <button aria-label={`Remover produto ${index + 1}`} onClick={() => removeProductItem(item.id)} type="button">
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
            ))}
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
            <Button onClick={addProductItem} type="button" variant="secondary">
              <Plus aria-hidden="true" size={18} />
              Adicionar produto
            </Button>
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
                <select id="viesRegata" onChange={(event) => setViesRegata(event.currentTarget.value)} value={viesRegata ?? ""}>
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
                  onValueChange={setAcabamentoManga}
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
                setGola(value);
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
                onValueChange={setAcabamentoGola}
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
                onChange={(event) => setReforcoGola(event.currentTarget.value)}
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
                onChange={(event) => setAberturaLateral(event.currentTarget.value)}
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
              onChange={(event) => setFilete(event.currentTarget.value)}
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
              onChange={(event) => setFaixa(event.currentTarget.value)}
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
              defaultValue={ficha?.arte ?? undefined}
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
              defaultValue={ficha?.com_nomes?.toString() ?? ""}
            >
              <option value="">Não informado</option>
              <option value="0">Nenhum</option>
              <option value="1">Com nomes</option>
              <option value="2">Com nomes e números</option>
              <option value="3">Somente números</option>
            </select>
          </Field>
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
          <Field label="Composição" name="composicao" error={state.fieldErrors?.composicao}>
            <input
              id="composicao"
              name="composicao"
              aria-describedby={state.fieldErrors?.composicao ? "composicao-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.composicao)}
              onChange={(event) => {
                autoComposicaoRef.current = false;
                setComposicao(event.currentTarget.value);
              }}
              placeholder="100% poliéster…"
              value={composicao ?? ""}
            />
          </Field>
          </div>
          <div className="form-subsection form-subsection--single">
            <h3>Observações</h3>
          <Field label="Observações" name="observacoes" error={state.fieldErrors?.observacoes} full>
            <textarea
              id="observacoes"
              name="observacoes"
              aria-describedby={state.fieldErrors?.observacoes ? "observacoes-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.observacoes)}
              defaultValue={ficha?.observacoes ?? undefined}
              rows={4}
              placeholder="Detalhes importantes para produção…"
            />
          </Field>
          </div>
        </fieldset>

        <fieldset className="form-section form-section--media">
          <legend>
            <Images aria-hidden="true" size={18} />
            <span>Arte / Imagens do Produto</span>
          </legend>
          <div className="image-upload-panel" data-has-images={imagens.length > 0 ? "true" : "false"}>
            <div className="image-upload-panel__intro">
              <Images aria-hidden="true" size={28} />
              <div>
                <strong>Imagens do produto</strong>
                <span>{imagens.length}/4 imagens adicionadas</span>
              </div>
            </div>

            {imagens.length > 0 ? (
              <div className="image-upload-grid">
                {imagens.map((image) => (
                  <article className="image-upload-card" key={image.id}>
                    <div className="image-upload-card__preview">
                      <div
                        aria-label={image.altText || "Imagem do produto"}
                        className="image-upload-card__preview-image"
                        role="img"
                        style={{ backgroundImage: `url("${image.previewUrl ?? image.secureUrl}")` }}
                      />
                    </div>
                    {image.file ? <span className="image-upload-card__badge">Pendente</span> : null}
                    <label>
                      <span>Descrição</span>
                      <input
                        aria-label="Descrição da imagem"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setImagens((current) =>
                            current.map((item) => (item.id === image.id ? { ...item, altText: value } : item)),
                          );
                        }}
                        placeholder="Frente da peça…"
                        value={image.altText}
                      />
                    </label>
                    <button
                      aria-label="Remover imagem"
                      className="image-upload-card__remove"
                      onClick={() => void handleRemoveImage(image)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
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
        <SubmitButton isUploading={isUploadingImage} label={mode === "edit" ? "Salvar alterações" : "Salvar ficha"} />
      </div>
    </form>
  );
}

type FieldProps = {
  children: React.ReactNode;
  error?: string;
  full?: boolean;
  label: string;
  name: string;
  required?: boolean;
};

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
