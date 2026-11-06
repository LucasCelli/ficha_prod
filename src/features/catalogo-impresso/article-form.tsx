"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ImagePlus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui";
import { saveCatalogPrintEntryAction, initialCatalogPrintActionState } from "./actions";
import type { CatalogPrintCategory, CatalogPrintEntry, CatalogPrintSection } from "./types";

type EditableImage = { altText: string; height?: number | null; publicId?: string | null; sourceFichaImageId?: string | null; url: string; width?: number | null };
type Source = { id: string; arte: string | null; material: string | null; composicao: string | null; manga: string | null; gola: string | null; acabamento_manga: string | null; acabamento_gola: string | null; bolso: string | null; ficha_itens: Array<{ produto: string | null; detalhes_produto: string | null }>; ficha_imagens: Array<{ id: string; url: string; alt_text: string | null; width: number | null; height: number | null }> };

function sourceHighlights(source?: Source | null) {
  if (!source) return "";
  return [source.material && `Material: ${source.material}`, source.composicao && `Composição: ${source.composicao}`, source.manga && `Manga: ${source.manga}`, source.gola && `Gola: ${source.gola}`, source.acabamento_manga && `Acabamento de manga: ${source.acabamento_manga}`, source.acabamento_gola && `Acabamento de gola: ${source.acabamento_gola}`, source.bolso && `Bolso: ${source.bolso}`].filter(Boolean).slice(0, 8).join("\n");
}

export function CatalogPrintArticleForm({ categories, entry, source, initialSection = "produto" }: { categories: CatalogPrintCategory[]; entry?: CatalogPrintEntry | null; source?: Source | null; initialSection?: CatalogPrintSection }) {
  const [state, action, pending] = useActionState(saveCatalogPrintEntryAction, initialCatalogPrintActionState);
  const [section, setSection] = useState<CatalogPrintSection>(entry?.section ?? initialSection);
  const [images, setImages] = useState<EditableImage[]>(() => entry?.images.map((image) => ({ altText: image.alt_text ?? "", height: image.height, publicId: image.public_id, sourceFichaImageId: image.source_ficha_image_id, url: image.url, width: image.width })) ?? []);
  const [uploading, setUploading] = useState(false);
  const availableCategories = useMemo(() => categories.filter((category) => category.section === section && category.active), [categories, section]);
  const products = [...new Set((source?.ficha_itens ?? []).map((item) => item.produto?.trim()).filter(Boolean))] as string[];
  const defaultTitle = section === "personalizacao" ? source?.arte ?? "" : products[0] ?? "";

  function addSourceImage(image: Source["ficha_imagens"][number]) {
    if (images.length >= 4 || images.some((item) => item.sourceFichaImageId === image.id)) return;
    setImages((current) => [...current, { altText: image.alt_text ?? defaultTitle, height: image.height, sourceFichaImageId: image.id, url: image.url, width: image.width }]);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = 4 - images.length;
    const selected = [...files].slice(0, room);
    setUploading(true);
    try {
      const uploaded: EditableImage[] = [];
      for (const file of selected) {
        const signatureResponse = await fetch("/api/catalogo-impresso/imagens/assinatura", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ altText: file.name }) });
        if (!signatureResponse.ok) throw new Error("Não foi possível preparar o upload.");
        const signature = await signatureResponse.json();
        const form = new FormData();
        form.append("file", file); form.append("api_key", signature.apiKey); form.append("timestamp", String(signature.timestamp));
        form.append("signature", signature.signature); form.append("folder", signature.folder); form.append("public_id", signature.publicId);
        form.append("transformation", signature.transformation); form.append("context", `alt=${file.name}`); form.append("tags", "catalogo_impresso,next");
        const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { body: form, method: "POST" });
        if (!response.ok) throw new Error(`Falha ao enviar ${file.name}.`);
        const result = await response.json();
        uploaded.push({ altText: file.name, height: result.height, publicId: result.public_id, url: result.secure_url, width: result.width });
      }
      setImages((current) => [...current, ...uploaded].slice(0, 4));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha no upload.");
    } finally { setUploading(false); }
  }

  return (
    <form action={action} className="catalog-print-form">
      <input name="id" type="hidden" value={entry?.id ?? ""} />
      <input name="sourceFichaId" type="hidden" value={entry?.source_ficha_id ?? source?.id ?? ""} />
      <input name="imagesJson" type="hidden" value={JSON.stringify(images)} />
      <div className="catalog-print-form__grid">
        <label><span>Seção</span><select name="section" value={section} onChange={(event) => setSection(event.target.value as CatalogPrintSection)}><option value="produto">Produtos</option><option value="personalizacao">Personalizações</option></select></label>
        <label><span>Categoria</span><select defaultValue={entry?.category_id ?? ""} name="categoryId" required><option value="">Selecione</option>{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{state.fieldErrors?.categoryId ? <small>{state.fieldErrors.categoryId}</small> : null}</label>
        <label><span>Ordem</span><input defaultValue={entry?.sort_order ?? 0} min="0" name="sortOrder" type="number" /></label>
      </div>
      <label><span>Título comercial</span><input defaultValue={entry?.title ?? defaultTitle} maxLength={180} name="title" required />{state.fieldErrors?.title ? <small>{state.fieldErrors.title}</small> : null}</label>
      <label><span>Descrição</span><textarea defaultValue={entry?.description ?? ""} maxLength={2000} name="description" rows={4} /></label>
      <label><span>Destaques comerciais <small>(um por linha, até 8)</small></span><textarea defaultValue={entry?.highlights.join("\n") ?? sourceHighlights(source)} name="highlights" rows={6} />{state.fieldErrors?.highlights ? <small>{state.fieldErrors.highlights}</small> : null}</label>
      <label className="catalog-print-check"><input defaultChecked={entry?.active ?? true} name="active" type="checkbox" /> Incluir na próxima publicação</label>

      <section className="catalog-print-images">
        <div className="catalog-print-panel-title"><div><ImagePlus size={18} /><h2>Imagens ({images.length}/4)</h2></div><label className="ui-button ui-button--secondary"><Upload size={16} /> {uploading ? "Enviando..." : "Enviar imagens"}<input accept="image/jpeg,image/png,image/webp" disabled={uploading || images.length >= 4} hidden multiple onChange={(event) => void uploadFiles(event.target.files)} type="file" /></label></div>
        {source?.ficha_imagens.length ? <div><p className="catalog-print-help">Selecione imagens da ficha:</p><div className="catalog-print-source-images">{source.ficha_imagens.map((image) => <button disabled={images.length >= 4 || images.some((item) => item.sourceFichaImageId === image.id)} key={image.id} onClick={() => addSourceImage(image)} type="button"><Image alt={image.alt_text ?? "Imagem da ficha"} height={90} src={image.url} width={140} /></button>)}</div></div> : null}
        <div className="catalog-print-selected-images">{images.map((image, index) => <article key={`${image.url}-${index}`}><Image alt={image.altText || "Imagem do artigo"} height={150} src={image.url} width={220} /><input aria-label={`Texto alternativo da imagem ${index + 1}`} onChange={(event) => setImages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, altText: event.target.value } : item))} placeholder="Descrição da imagem" value={image.altText} /><button aria-label="Remover imagem" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 size={16} /></button></article>)}</div>
        {state.fieldErrors?.images ? <small className="catalog-print-error">{state.fieldErrors.images}</small> : null}
      </section>
      {state.message ? <p className={`catalog-print-message catalog-print-message--${state.status}`}>{state.message}</p> : null}
      <div className="catalog-print-form__actions"><Link className="ui-button ui-button--secondary" href="/catalogo-impresso">Cancelar</Link><Button disabled={pending || uploading} type="submit"><Save size={16} /> {pending ? "Salvando..." : "Salvar artigo"}</Button></div>
    </form>
  );
}
