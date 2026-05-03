import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { FichaForm } from "@/features/fichas/ficha-form";
import { listFichaFormOptions } from "@/features/fichas/form-options";

export const metadata: Metadata = {
  title: "Nova ficha | Fichas Técnicas",
};

export default async function NovaFichaPage() {
  const formOptions = await listFichaFormOptions();

  return (
    <section className="ficha-create" aria-labelledby="nova-ficha-title">
      <header className="ficha-create__header">
        <Badge tone="info">Cadastro</Badge>
        <h1 id="nova-ficha-title" className="app-title">
          Nova ficha
        </h1>
        <p className="app-summary">
          Preencha os dados comerciais e técnicos da ficha com os mesmos controles condicionais do fluxo legado.
        </p>
      </header>

      <Card className="ficha-create__card">
        <FichaForm {...formOptions} />
      </Card>

      <Link className="ui-button ui-button--ghost" href="/fichas">
        Voltar para fichas
      </Link>
    </section>
  );
}
