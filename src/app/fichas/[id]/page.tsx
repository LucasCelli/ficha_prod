import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, EmptyState } from "@/components/ui";
import { FichaForm } from "@/features/fichas/ficha-form";
import { FichaStatusActions } from "@/features/fichas/ficha-status-actions";
import { getFichaById } from "@/features/fichas/data";
import { listFichaFormOptions } from "@/features/fichas/form-options";

type FichaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: FichaPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getFichaById(id);

  if (result.kind !== "ok") {
    return {
      title: "Ficha | Fichas Técnicas",
    };
  }

  return {
    title: `${result.ficha.cliente_nome_snapshot} | Fichas Técnicas`,
  };
}

export default async function FichaPage({ params }: FichaPageProps) {
  const { id } = await params;
  const [result, formOptions] = await Promise.all([getFichaById(id), listFichaFormOptions()]);

  if (result.kind === "not-found") {
    notFound();
  }

  if (result.kind === "not-configured") {
    return (
      <EmptyState
        actions={
          <Link className="ui-button ui-button--secondary" href="/fichas">
            Voltar para fichas
          </Link>
        }
        title="Supabase ainda não configurado"
        description="A edição de ficha já está preparada, mas precisa das variáveis de ambiente do Supabase para carregar os dados."
      />
    );
  }

  if (result.kind === "error") {
    return (
      <EmptyState
        actions={
          <Link className="ui-button ui-button--secondary" href="/fichas">
            Voltar para fichas
          </Link>
        }
        title="Não foi possível carregar a ficha"
        description={`A consulta ao Supabase falhou: ${result.message}`}
      />
    );
  }

  const ficha = result.ficha;

  if (!ficha) {
    notFound();
  }

  return (
    <section className="ficha-create" aria-labelledby="editar-ficha-title">
      <header className="ficha-create__header">
        <Badge tone="info">Edição</Badge>
        <h1 id="editar-ficha-title" className="app-title">
          Editar ficha
        </h1>
        <p className="app-summary">
          Atualize os dados comerciais e técnicos de {ficha.cliente_nome_snapshot} com os controles condicionais da ficha.
        </p>
      </header>

      <Card className="ficha-create__card">
        <FichaForm {...formOptions} ficha={ficha} mode="edit" />
      </Card>

      <Card className="ficha-create__card">
        <FichaStatusActions fichaId={ficha.id} status={ficha.status} />
      </Card>

      <Link className="ui-button ui-button--ghost" href="/fichas">
        Voltar para fichas
      </Link>
    </section>
  );
}
