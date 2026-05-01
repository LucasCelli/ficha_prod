import type { Metadata } from "next";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ClienteForm } from "@/features/clientes/cliente-form";
import { getClienteById } from "@/features/clientes/data";

type EditarClientePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: EditarClientePageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getClienteById(id);

  if (result.kind !== "ok") {
    return {
      title: "Editar cliente | Fichas Técnicas",
    };
  }

  return {
    title: `Editar ${result.cliente.nome} | Fichas Técnicas`,
  };
}

export default async function EditarClientePage({ params }: EditarClientePageProps) {
  const { id } = await params;
  const result = await getClienteById(id);

  if (result.kind === "not-configured") {
    return (
      <EmptyState
        title="Supabase ainda não configurado"
        description="Configure as variáveis de ambiente do Supabase para editar clientes."
      />
    );
  }

  if (result.kind === "not-found") {
    return (
      <EmptyState
        title="Cliente não encontrado"
        description="O cliente solicitado não existe na tabela nova ou ainda não foi importado."
      />
    );
  }

  if (result.kind === "error") {
    return <EmptyState title="Não foi possível carregar o cliente" description={`A consulta ao Supabase falhou: ${result.message}`} />;
  }

  return (
    <section className="cliente-create" aria-labelledby="cliente-edit-title">
      <header className="cliente-create__header">
        <Badge tone="info">Edição</Badge>
        <h1 id="cliente-edit-title" className="app-title">
          Editar cliente
        </h1>
        <p className="app-summary">
          Atualize os dados principais de {result.cliente.nome} mantendo o vínculo com o histórico de fichas.
        </p>
      </header>

      <Card className="cliente-create__card">
        <ClienteForm cliente={result.cliente} mode="edit" />
      </Card>
    </section>
  );
}
