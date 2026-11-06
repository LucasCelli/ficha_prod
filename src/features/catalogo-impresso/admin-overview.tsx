"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Download, Eye, FilePlus2,
  FolderPlus, ImageIcon, PackageOpen, Pencil, Plus, RefreshCw, Search, Settings, Trash2,
} from "lucide-react";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import {
  deleteCatalogPrintCategoryAction, deleteCatalogPrintEntryAction, reviewCatalogPrintFichaAction,
  saveCatalogPrintCategoryAction, saveCatalogPrintSettingsAction,
} from "./actions";
import { initialCatalogPrintActionState } from "./form-state";
import type { CatalogPrintCategory, CatalogPrintDashboard, CatalogPrintSection } from "./types";
import { catalogPrintSectionLabels } from "./types";

type View = "articles" | "sources" | "categories" | "settings";
const SOURCE_PAGE_SIZE = 10;

export function CatalogPrintAdminOverview({ data, initialView = "articles" }: { data: CatalogPrintDashboard; initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [publishing, setPublishing] = useState(false);
  const activeEntries = data.entries.filter((entry) => entry.active);
  const canPublish = activeEntries.length > 0;

  async function publish() {
    if (!canPublish) return;
    setPublishing(true);
    try {
      const response = await fetch("/api/catalogo-impresso/publicar", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível gerar o PDF.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao publicar.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="catalog-print-admin">
      <PageHeader
        actions={<div className="catalog-print-header-actions">
          {data.publication ? <><a className="ui-button ui-button--ghost" href="/api/catalogo-impresso/publico.pdf" rel="noreferrer" target="_blank"><Eye size={16} /> Visualizar PDF</a><a className="ui-button ui-button--secondary" href="/api/catalogo-impresso/publico.pdf?download=1"><Download size={16} /> Baixar</a></> : null}
          <Button disabled={publishing || !canPublish} onClick={() => void publish()} title={!canPublish ? "Crie e ative pelo menos um artigo." : undefined}><RefreshCw className={publishing ? "catalog-print-spin" : undefined} size={16} />{publishing ? "Gerando PDF..." : data.publication ? "Publicar nova versão" : "Gerar e publicar"}</Button>
        </div>}
        eyebrow="Administração"
        title="Catálogo impresso"
      ><p>Monte, organize e publique o material comercial sem alterar o catálogo interno das fichas.</p></PageHeader>

      <div className="catalog-print-status">
        <SummaryCard icon={PackageOpen} label="Artigos ativos" value={String(activeEntries.length)} />
        <SummaryCard icon={Clock3} label="Fichas por revisar" value={String(data.pendingSourceCount)} />
        <SummaryCard icon={BookOpen} label={data.publication ? `${data.publication.page_count} páginas · ${data.publication.generatedByName ?? "Admin"}` : "Nenhuma publicação"} value={data.publication ? new Date(data.publication.generated_at).toLocaleDateString("pt-BR") : "Rascunho"} />
      </div>

      {!canPublish ? <div className="catalog-print-notice"><ImageIcon aria-hidden="true" size={20} /><div><strong>O PDF ainda não pode ser gerado.</strong><span>Crie um artigo, escolha pelo menos uma imagem e mantenha-o ativo.</span></div></div> : null}

      <nav className="catalog-print-tabs" aria-label="Áreas do catálogo">
        <Tab active={view === "articles"} icon={BookOpen} label="Artigos" onClick={() => setView("articles")} />
        <Tab active={view === "sources"} badge={data.pendingSourceCount} icon={FilePlus2} label="Revisar fichas" onClick={() => setView("sources")} />
        <Tab active={view === "categories"} icon={FolderPlus} label="Categorias" onClick={() => setView("categories")} />
        <Tab active={view === "settings"} icon={Settings} label="Capa e contatos" onClick={() => setView("settings")} />
      </nav>

      {view === "articles" ? <Articles data={data} /> : null}
      {view === "sources" ? <Sources data={data} /> : null}
      {view === "categories" ? <Categories categories={data.categories} /> : null}
      {view === "settings" ? <CatalogSettings data={data} /> : null}
    </section>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return <article><span className="catalog-print-status__icon"><Icon size={19} /></span><div><strong>{value}</strong><span>{label}</span></div></article>;
}

function Tab({ active, badge, icon: Icon, label, onClick }: { active: boolean; badge?: number; icon: typeof BookOpen; label: string; onClick: () => void }) {
  return <button aria-current={active ? "page" : undefined} onClick={onClick} type="button"><Icon size={16} /> {label}{badge ? <Badge>{badge}</Badge> : null}</button>;
}

function Articles({ data }: { data: CatalogPrintDashboard }) {
  return <section className="catalog-print-panel">
    <div className="catalog-print-panel-title"><div><BookOpen size={18} /><div><h2>Páginas do catálogo</h2><p>Ordene os artigos por categoria e defina o que entra na próxima versão.</p></div></div><Link className="ui-button ui-button--primary" href="/catalogo-impresso/artigos/novo"><Plus size={16} /> Novo artigo</Link></div>
    {data.entries.length === 0 ? <EmptyState actions={<Link className="ui-button ui-button--primary" href="/catalogo-impresso?view=sources">Revisar fichas</Link>} description="Escolha uma ficha existente para aproveitar imagens e especificações." title="Seu catálogo está vazio" /> : <div className="catalog-print-entry-list">{(["produto", "personalizacao"] as CatalogPrintSection[]).map((section) => {
      const sectionEntries = data.entries.filter((entry) => entry.section === section);
      if (!sectionEntries.length) return null;
      return <section key={section}><div className="catalog-print-section-heading"><h3>{catalogPrintSectionLabels[section]}</h3><Badge>{sectionEntries.length}</Badge></div>{data.categories.filter((category) => category.section === section && sectionEntries.some((entry) => entry.category_id === category.id)).map((category) => <div className="catalog-print-category-group" key={category.id}><h4>{category.name}</h4>{sectionEntries.filter((entry) => entry.category_id === category.id).map((entry) => <ArticleRow entry={entry} key={entry.id} />)}</div>)}</section>;
    })}</div>}
  </section>;
}

function ArticleRow({ entry }: { entry: CatalogPrintDashboard["entries"][number] }) {
  return <article className="catalog-print-entry-row">
    {entry.images[0] ? <Image alt="" height={82} src={entry.images[0].url} width={118} /> : <div className="catalog-print-entry-placeholder"><ImageIcon size={22} /></div>}
    <div className="catalog-print-entry-copy"><strong>{entry.title}</strong><span>{entry.description || "Sem descrição comercial"}</span><small>Ordem {entry.sort_order} · {entry.images.length} imagem(ns)</small></div>
    <Badge tone={entry.active ? "success" : "neutral"}>{entry.active ? "No próximo PDF" : "Fora do PDF"}</Badge>
    <div className="catalog-print-row-actions"><Link className="ui-button ui-button--secondary" href={`/catalogo-impresso/artigos/${entry.id}`}><Pencil size={15} /> Editar</Link><form action={deleteCatalogPrintEntryAction} onSubmit={(event) => { if (!window.confirm(`Excluir ${entry.title}?`)) event.preventDefault(); }}><input name="id" type="hidden" value={entry.id} /><button aria-label={`Excluir ${entry.title}`} className="ui-button ui-button--danger" type="submit"><Trash2 size={15} /></button></form></div>
  </article>;
}

function Sources({ data }: { data: CatalogPrintDashboard }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return data.pendingSources;
    return data.pendingSources.filter((source) => [...source.products, source.material, source.arte].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(normalized));
  }, [data.pendingSources, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / SOURCE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * SOURCE_PAGE_SIZE, safePage * SOURCE_PAGE_SIZE);
  function changeQuery(value: string) { setQuery(value); setPage(1); }

  return <section className="catalog-print-panel">
    <div className="catalog-print-panel-title catalog-print-panel-title--stack-mobile"><div><FilePlus2 size={18} /><div><h2>Fichas para revisar</h2><p>Crie um ou mais artigos e conclua a revisão quando terminar.</p></div></div><label className="catalog-print-search"><Search size={16} /><input aria-label="Buscar fichas" onChange={(event) => changeQuery(event.target.value)} placeholder="Buscar produto, material ou personalização" value={query} /></label></div>
    <div className="catalog-print-source-summary"><span>Exibindo {visible.length} de {filtered.length} fichas carregadas</span>{data.pendingSourceCount > data.pendingSources.length ? <small>A fila carrega as 40 fichas mais recentes por vez.</small> : null}</div>
    {visible.length === 0 ? <EmptyState description={query ? "Tente outra busca nesta página da fila." : "Todas as fichas encontradas foram revisadas ou ignoradas."} title={query ? "Nenhuma ficha encontrada" : "Fila concluída"} /> : <div className="catalog-print-source-list">{visible.map((source) => <SourceRow key={source.id} source={source} />)}</div>}
    {pageCount > 1 ? <div className="catalog-print-pagination"><button className="ui-button ui-button--secondary" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button"><ChevronLeft size={16} /> Anterior</button><span>Página {safePage} de {pageCount}</span><button className="ui-button ui-button--secondary" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} type="button">Próxima <ChevronRight size={16} /></button></div> : null}
  </section>;
}

function SourceRow({ source }: { source: CatalogPrintDashboard["pendingSources"][number] }) {
  return <article>
    {source.images[0] ? <Image alt="" height={96} src={source.images[0].url} width={144} /> : <div className="catalog-print-entry-placeholder"><ImageIcon size={22} /></div>}
    <div className="catalog-print-source-copy"><div className="catalog-print-source-title"><strong>{source.products.join(", ") || "Produto não informado"}</strong>{source.entryCount ? <Badge tone="success">{source.entryCount} criado(s)</Badge> : null}</div><span>{[source.material, source.arte].filter(Boolean).join(" · ") || "Sem detalhes comerciais"}</span><small>{source.images.length} imagem(ns) disponível(is)</small></div>
    <div className="catalog-print-source-actions"><Link className="ui-button ui-button--primary" href={`/catalogo-impresso/artigos/novo?ficha=${source.id}&secao=produto`}>Criar produto</Link><Link className="ui-button ui-button--secondary" href={`/catalogo-impresso/artigos/novo?ficha=${source.id}&secao=personalizacao`}>Criar personalização</Link><form action={reviewCatalogPrintFichaAction}><input name="fichaId" type="hidden" value={source.id} /><input name="status" type="hidden" value="revisada" /><button className="ui-button ui-button--ghost" type="submit"><Check size={15} /> Concluir</button></form></div>
    <details className="catalog-print-ignore"><summary>Ignorar ficha</summary><form action={reviewCatalogPrintFichaAction}><input name="fichaId" type="hidden" value={source.id} /><input name="status" type="hidden" value="ignorada" /><input aria-label="Motivo para ignorar" name="reason" placeholder="Informe o motivo" required /><button className="ui-button ui-button--danger" type="submit">Ignorar</button></form></details>
  </article>;
}

function CategoryForm({ category }: { category?: CatalogPrintCategory }) {
  const [state, action, pending] = useActionState(saveCatalogPrintCategoryAction, initialCatalogPrintActionState);
  return <form action={action} className={`catalog-print-category-form${category ? "" : " catalog-print-category-form--new"}`}>
    <input name="id" type="hidden" value={category?.id ?? ""} />
    <label><span>Seção</span><select defaultValue={category?.section ?? "produto"} name="section"><option value="produto">Produtos</option><option value="personalizacao">Personalizações</option></select></label>
    <label><span>Nome</span><input defaultValue={category?.name ?? ""} name="name" placeholder="Ex.: Camisetas" required /></label>
    <label><span>Ordem</span><input defaultValue={category?.sort_order ?? 0} min="0" name="sortOrder" type="number" /></label>
    <label className="catalog-print-check"><input defaultChecked={category?.active ?? true} name="active" type="checkbox" /> Ativa</label>
    <div className="catalog-print-category-actions"><Button disabled={pending} type="submit"><Check size={15} /> {category ? "Salvar" : "Adicionar"}</Button>{category ? <button aria-label={`Excluir ${category.name}`} className="ui-button ui-button--danger" formAction={deleteCatalogPrintCategoryAction} type="submit"><Trash2 size={15} /></button> : null}</div>
    {state.message ? <small className={`catalog-print-message--${state.status}`}>{state.message}</small> : null}
  </form>;
}

function Categories({ categories }: { categories: CatalogPrintCategory[] }) {
  return <section className="catalog-print-panel">
    <div className="catalog-print-panel-title"><div><FolderPlus size={18} /><div><h2>Categorias e ordem</h2><p>As categorias organizam o sumário e a sequência das páginas no PDF.</p></div></div></div>
    <div className="catalog-print-new-category"><h3><Plus size={16} /> Nova categoria</h3><CategoryForm /></div>
    {(["produto", "personalizacao"] as CatalogPrintSection[]).map((section) => <div className="catalog-print-category-section" key={section}><div><h3>{catalogPrintSectionLabels[section]}</h3><Badge>{categories.filter((item) => item.section === section).length}</Badge></div>{categories.filter((item) => item.section === section).map((category) => <CategoryForm category={category} key={category.id} />)}</div>)}
  </section>;
}

function CatalogSettings({ data }: { data: CatalogPrintDashboard }) {
  const [state, action, pending] = useActionState(saveCatalogPrintSettingsAction, initialCatalogPrintActionState);
  const settings = data.settings;
  return <form action={action} className="catalog-print-panel catalog-print-settings">
    <div className="catalog-print-panel-title"><div><Settings size={18} /><div><h2>Capa, identidade e contracapa</h2><p>Estas alterações entram no link público somente após uma nova publicação.</p></div></div></div>
    <fieldset><legend>Identidade do catálogo</legend><div className="catalog-print-form__grid"><label><span>Nome da empresa</span><input defaultValue={settings.business_name} name="businessName" required /></label><label><span>Título principal</span><input defaultValue={settings.title} name="title" required /></label><label><span>Subtítulo</span><input defaultValue={settings.subtitle ?? ""} name="subtitle" placeholder="Opcional" /></label><label><span>Logo</span><input defaultValue={settings.logo_url ?? ""} name="logoUrl" /><small>Use o logo padrão ou uma URL do Cloudinary.</small></label><label className="catalog-print-wide"><span>Imagem de capa</span><input defaultValue={settings.cover_image_url ?? ""} name="coverImageUrl" placeholder="URL do Cloudinary (opcional)" /></label></div></fieldset>
    <fieldset><legend>Contatos da contracapa</legend><div className="catalog-print-form__grid"><label><span>WhatsApp</span><input defaultValue={settings.whatsapp ?? ""} name="whatsapp" /></label><label><span>Instagram</span><input defaultValue={settings.instagram ?? ""} name="instagram" /></label><label><span>E-mail</span><input defaultValue={settings.email ?? ""} name="email" /></label><label className="catalog-print-wide"><span>Endereço</span><input defaultValue={settings.address ?? ""} name="address" /></label><label className="catalog-print-wide"><span>Mensagem final</span><textarea defaultValue={settings.footer_text ?? ""} name="footerText" placeholder="Ex.: Solicite um orçamento para seu projeto." rows={3} /></label></div></fieldset>
    {state.message ? <p className={`catalog-print-message catalog-print-message--${state.status}`}>{state.message}</p> : null}
    <div className="catalog-print-form__actions"><Button disabled={pending} type="submit">{pending ? "Salvando..." : "Salvar configurações"}</Button></div>
  </form>;
}
