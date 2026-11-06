import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/features/auth/session";
import { CatalogPrintArticleForm } from "@/features/catalogo-impresso/article-form";
import { getCatalogPrintDashboard, getCatalogPrintSource } from "@/features/catalogo-impresso/data";
import type { CatalogPrintSection } from "@/features/catalogo-impresso/types";

export default async function NovoArtigoCatalogoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSuperadmin();
  const params = await searchParams;
  const fichaId = Array.isArray(params.ficha) ? params.ficha[0] : params.ficha;
  const sectionParam = Array.isArray(params.secao) ? params.secao[0] : params.secao;
  const section: CatalogPrintSection = sectionParam === "personalizacao" ? "personalizacao" : "produto";
  const [dashboard, source] = await Promise.all([getCatalogPrintDashboard(), fichaId ? getCatalogPrintSource(fichaId) : Promise.resolve(null)]);
  return <section className="catalog-print-editor"><PageHeader actions={<Link className="ui-button ui-button--secondary" href="/catalogo-impresso"><ArrowLeft size={16} /> Voltar</Link>} eyebrow="Catálogo impresso" title="Novo artigo"><p>Crie uma página comercial independente da ficha de produção.</p></PageHeader><CatalogPrintArticleForm categories={dashboard.categories} initialSection={section} source={source} /></section>;
}
