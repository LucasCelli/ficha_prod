import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/features/auth/session";
import { CatalogPrintArticleForm } from "@/features/catalogo-impresso/article-form";
import { getCatalogPrintDashboard, getCatalogPrintEntry } from "@/features/catalogo-impresso/data";

export default async function EditarArtigoCatalogoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperadmin();
  const { id } = await params;
  const [dashboard, entry] = await Promise.all([getCatalogPrintDashboard(), getCatalogPrintEntry(id)]);
  if (!entry) notFound();
  return <section className="catalog-print-editor"><PageHeader actions={<Link className="ui-button ui-button--secondary" href="/catalogo-impresso"><ArrowLeft size={16} /> Voltar</Link>} eyebrow="Catálogo impresso" title={`Editar: ${entry.title}`} /><CatalogPrintArticleForm categories={dashboard.categories} entry={entry} /></section>;
}
