"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { BookOpen, Check, Download, FilePlus2, FolderPlus, Pencil, RefreshCw, Settings, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { deleteCatalogPrintCategoryAction, deleteCatalogPrintEntryAction, initialCatalogPrintActionState, reviewCatalogPrintFichaAction, saveCatalogPrintCategoryAction, saveCatalogPrintSettingsAction } from "./actions";
import type { CatalogPrintCategory, CatalogPrintDashboard, CatalogPrintSection } from "./types";
import { catalogPrintSectionLabels } from "./types";

type View = "articles" | "sources" | "categories" | "settings";

export function CatalogPrintAdminOverview({ data, initialView = "articles" }: { data: CatalogPrintDashboard; initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [publishing, setPublishing] = useState(false);

  async function publish() {
    setPublishing(true);
    try {
      const response = await fetch("/api/catalogo-impresso/publicar", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível gerar o PDF.");
      window.location.reload();
    } catch (error) { window.alert(error instanceof Error ? error.message : "Falha ao publicar."); }
    finally { setPublishing(false); }
  }

  return (
    <section className="catalog-print-admin">
      <PageHeader actions={<div className="catalog-print-header-actions">{data.publication ? <><a className="ui-button ui-button--ghost" href="/api/catalogo-impresso/publico.pdf" rel="noreferrer" target="_blank"><BookOpen size={16} /> Abrir link público</a><a className="ui-button ui-button--secondary" href="/api/catalogo-impresso/publico.pdf?download=1"><Download size={16} /> Baixar publicado</a></> : null}<Button disabled={publishing} onClick={() => void publish()}><RefreshCw className={publishing ? "catalog-print-spin" : undefined} size={16} /> {publishing ? "Gerando PDF..." : "Gerar e publicar"}</Button></div>} eyebrow="Administração" title="Catálogo impresso">
        <p>Catálogo comercial independente das opções internas das fichas.</p>
      </PageHeader>
      <div className="catalog-print-status">
        <div><strong>{data.entries.filter((item) => item.active).length}</strong><span>artigos ativos</span></div>
        <div><strong>{data.pendingSourceCount}</strong><span>fichas por revisar</span></div>
        <div><strong>{data.publication ? new Date(data.publication.generated_at).toLocaleDateString("pt-BR") : "—"}</strong><span>{data.publication ? `${data.publication.page_count} páginas · ${data.publication.generatedByName ?? "Admin"}` : "nenhuma publicação"}</span></div>
      </div>
      <nav className="catalog-print-tabs" aria-label="Áreas do catálogo">
        <button aria-current={view === "articles" ? "page" : undefined} onClick={() => setView("articles")}><BookOpen size={16} /> Artigos</button>
        <button aria-current={view === "sources" ? "page" : undefined} onClick={() => setView("sources")}><FilePlus2 size={16} /> Revisar fichas <Badge>{data.pendingSourceCount}</Badge></button>
        <button aria-current={view === "categories" ? "page" : undefined} onClick={() => setView("categories")}><FolderPlus size={16} /> Categorias</button>
        <button aria-current={view === "settings" ? "page" : undefined} onClick={() => setView("settings")}><Settings size={16} /> Capa e contatos</button>
      </nav>
      {view === "articles" ? <Articles data={data} /> : null}
      {view === "sources" ? <Sources data={data} /> : null}
      {view === "categories" ? <Categories categories={data.categories} /> : null}
      {view === "settings" ? <CatalogSettings data={data} /> : null}
    </section>
  );
}

function Articles({ data }: { data: CatalogPrintDashboard }) {
  return <div className="catalog-print-panel"><div className="catalog-print-panel-title"><div><BookOpen size={18} /><h2>Páginas do catálogo</h2></div></div>{data.entries.length === 0 ? <EmptyState actions={<Link className="ui-button ui-button--primary" href="/catalogo-impresso/artigos/novo">Criar artigo</Link>} description="Importe uma ficha ou crie a primeira página comercial." title="Catálogo vazio" /> : <div className="catalog-print-entry-list">{(["produto", "personalizacao"] as CatalogPrintSection[]).map((section) => <section key={section}><h3>{catalogPrintSectionLabels[section]}</h3>{data.categories.filter((category) => category.section === section).map((category) => <div key={category.id}><h4>{category.name}</h4>{data.entries.filter((entry) => entry.category_id === category.id).map((entry) => <article className="catalog-print-entry-row" key={entry.id}>{entry.images[0] ? <Image alt="" height={72} src={entry.images[0].url} width={104} /> : <div className="catalog-print-entry-placeholder" />}<div><strong>{entry.title}</strong><span>{entry.description || "Sem descrição"}</span></div><Badge tone={entry.active ? "success" : "neutral"}>{entry.active ? "Ativo" : "Rascunho"}</Badge><Link aria-label={`Editar ${entry.title}`} className="ui-button ui-button--secondary" href={`/catalogo-impresso/artigos/${entry.id}`}><Pencil size={15} /> Editar</Link><form action={deleteCatalogPrintEntryAction} onSubmit={(event) => { if (!window.confirm(`Excluir ${entry.title}?`)) event.preventDefault(); }}><input name="id" type="hidden" value={entry.id} /><button aria-label={`Excluir ${entry.title}`} className="ui-button ui-button--danger" type="submit"><Trash2 size={15} /></button></form></article>)}</div>)}</section>)}</div>}</div>;
}

function Sources({ data }: { data: CatalogPrintDashboard }) {
  return <div className="catalog-print-panel"><div className="catalog-print-panel-title"><div><FilePlus2 size={18} /><h2>Fichas ainda não revisadas</h2></div></div>{data.pendingSources.length === 0 ? <EmptyState description="Todas as fichas encontradas foram revisadas ou ignoradas." title="Fila concluída" /> : <div className="catalog-print-source-list">{data.pendingSources.map((source) => <article key={source.id}>{source.images[0] ? <Image alt="" height={90} src={source.images[0].url} width={140} /> : <div className="catalog-print-entry-placeholder" />}<div><strong>{source.products.join(", ") || "Produto não informado"}</strong><span>{[source.material, source.arte].filter(Boolean).join(" · ") || "Sem detalhes comerciais"}</span><small>{source.entryCount ? `${source.entryCount} artigo(s) já criado(s)` : "Ainda sem artigo"}</small></div><div className="catalog-print-source-actions"><Link className="ui-button ui-button--primary" href={`/catalogo-impresso/artigos/novo?ficha=${source.id}&secao=produto`}>Criar produto</Link><Link className="ui-button ui-button--secondary" href={`/catalogo-impresso/artigos/novo?ficha=${source.id}&secao=personalizacao`}>Criar personalização</Link><form action={reviewCatalogPrintFichaAction}><input name="fichaId" type="hidden" value={source.id} /><input name="status" type="hidden" value="revisada" /><button className="ui-button ui-button--secondary" type="submit"><Check size={15} /> Concluir revisão</button></form><form action={reviewCatalogPrintFichaAction} className="catalog-print-ignore"><input name="fichaId" type="hidden" value={source.id} /><input name="status" type="hidden" value="ignorada" /><input aria-label="Motivo para ignorar" name="reason" placeholder="Motivo para ignorar" required /><button className="ui-button ui-button--ghost" type="submit">Ignorar</button></form></div></article>)}</div>}</div>;
}

function CategoryForm({ category }: { category?: CatalogPrintCategory }) {
  const [state, action, pending] = useActionState(saveCatalogPrintCategoryAction, initialCatalogPrintActionState);
  return <form action={action} className="catalog-print-category-form"><input name="id" type="hidden" value={category?.id ?? ""} /><select defaultValue={category?.section ?? "produto"} name="section"><option value="produto">Produtos</option><option value="personalizacao">Personalizações</option></select><input defaultValue={category?.name ?? ""} name="name" placeholder="Nome da categoria" required /><input aria-label="Ordem" defaultValue={category?.sort_order ?? 0} min="0" name="sortOrder" type="number" /><label><input defaultChecked={category?.active ?? true} name="active" type="checkbox" /> Ativa</label><Button disabled={pending} type="submit"><SaveIcon /> Salvar</Button>{category ? <button className="ui-button ui-button--danger" formAction={deleteCatalogPrintCategoryAction} type="submit"><Trash2 size={15} /></button> : null}{state.message ? <small>{state.message}</small> : null}</form>;
}

function SaveIcon() { return <Check size={15} />; }
function Categories({ categories }: { categories: CatalogPrintCategory[] }) { return <div className="catalog-print-panel"><div className="catalog-print-panel-title"><div><FolderPlus size={18} /><h2>Categorias e ordem</h2></div></div><CategoryForm />{categories.map((category) => <CategoryForm category={category} key={category.id} />)}</div>; }

function CatalogSettings({ data }: { data: CatalogPrintDashboard }) {
  const [state, action, pending] = useActionState(saveCatalogPrintSettingsAction, initialCatalogPrintActionState); const settings = data.settings;
  return <form action={action} className="catalog-print-panel catalog-print-settings"><div className="catalog-print-panel-title"><div><Settings size={18} /><h2>Capa, identidade e contracapa</h2></div></div><div className="catalog-print-form__grid"><label><span>Nome da empresa</span><input defaultValue={settings.business_name} name="businessName" required /></label><label><span>Título</span><input defaultValue={settings.title} name="title" required /></label><label><span>Subtítulo</span><input defaultValue={settings.subtitle ?? ""} name="subtitle" /></label><label><span>URL do logo</span><input defaultValue={settings.logo_url ?? ""} name="logoUrl" /></label><label><span>URL da imagem de capa</span><input defaultValue={settings.cover_image_url ?? ""} name="coverImageUrl" /></label><label><span>WhatsApp</span><input defaultValue={settings.whatsapp ?? ""} name="whatsapp" /></label><label><span>Instagram</span><input defaultValue={settings.instagram ?? ""} name="instagram" /></label><label><span>E-mail</span><input defaultValue={settings.email ?? ""} name="email" /></label><label><span>Endereço</span><input defaultValue={settings.address ?? ""} name="address" /></label><label className="catalog-print-wide"><span>Texto final</span><textarea defaultValue={settings.footer_text ?? ""} name="footerText" rows={3} /></label></div>{state.message ? <p className={`catalog-print-message catalog-print-message--${state.status}`}>{state.message}</p> : null}<div className="catalog-print-form__actions"><Button disabled={pending} type="submit">Salvar configurações</Button></div></form>;
}
