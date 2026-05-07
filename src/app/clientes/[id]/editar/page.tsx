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
        title="Cliente indisponível"
        description="Tente novamente."
      />
    );
  }

  if (result.kind === "not-found") {
    return (
      <EmptyState
        title="Cliente não encontrado"
        description="Verifique a busca."
      />
    );
  }

  if (result.kind === "error") {
    return <EmptyState title="Não foi possível carregar o cliente" description={result.message} />;
  }

  return (
    <section className="cliente-create" aria-labelledby="cliente-edit-title">
      <header className="cliente-create__header">
        <Badge tone="info">Edição</Badge>
        <h1 id="cliente-edit-title" className="app-title">
          Editar cliente
        </h1>
      </header>

      <Card className="cliente-create__card">
        <ClienteForm cliente={result.cliente} mode="edit" />
      </Card>
    </section>
  );
}
