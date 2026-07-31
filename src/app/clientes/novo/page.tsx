import type { Metadata } from "next";
import { Badge, Card } from "@/components/ui";
import { ClienteForm } from "@/features/clientes/cliente-form";
import { requireAppSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Novo cliente | Fichas Técnicas",
};

export default async function NovoClientePage() {
  await requireAppSession();

  return (
    <section className="cliente-create" aria-labelledby="cliente-create-title">
      <header className="cliente-create__header">
        <Badge tone="info">Cadastro</Badge>
        <h1 id="cliente-create-title" className="app-title">
          Novo cliente
        </h1>
      </header>

      <Card className="cliente-create__card">
        <ClienteForm />
      </Card>
    </section>
  );
}
