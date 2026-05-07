import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { getCurrentSession } from "@/features/auth/session";
import { getFichaById } from "@/features/fichas/data";
import { FichaForm } from "@/features/fichas/ficha-form";
import { mapFichaToInitialData } from "@/features/fichas/ficha-form-seed";
import { listFichaFormOptions } from "@/features/fichas/form-options";

export const metadata: Metadata = {
  title: "Nova ficha | Fichas Técnicas",
};

type NovaFichaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NovaFichaPage({ searchParams }: NovaFichaPageProps) {
  const params = await searchParams;
  const duplicateId = typeof params?.duplicar === "string" ? params.duplicar.trim() : "";
  const session = await getCurrentSession();
  const [formOptions, duplicateResult] = await Promise.all([
    listFichaFormOptions(),
    duplicateId ? getFichaById(duplicateId) : Promise.resolve(null),
  ]);
  const duplicateInitialData =
    duplicateResult?.kind === "ok" && duplicateResult.ficha
      ? {
          ...mapFichaToInitialData({
            ...duplicateResult.ficha,
            imagens: [],
          }),
          imagens: [],
        }
      : undefined;

  return (
    <section className="ficha-create" aria-labelledby="nova-ficha-title">
      <header className="ficha-create__header">
        <Badge tone="info">Cadastro</Badge>
        <h1 id="nova-ficha-title" className="app-title">
          {duplicateInitialData ? "Duplicar ficha" : "Nova ficha"}
        </h1>
      </header>

      <Card className="ficha-create__card">
        <FichaForm {...formOptions} canImportLegacyJson={session?.user.role === "superadmin"} initialData={duplicateInitialData} />
      </Card>

      <Link className="ui-button ui-button--ghost" href="/fichas">
        Voltar para fichas
      </Link>
    </section>
  );
}
