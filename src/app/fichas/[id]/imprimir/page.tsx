import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui";
import { getFichaById } from "@/features/fichas/data";
import { PrintFicha } from "@/features/fichas/print-ficha";
import { PrintOnLoad } from "@/features/fichas/print-on-load";
import { getCurrentSession } from "@/features/auth/session";

type PrintFichaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    listaNomesRaw?: string | string[];
  }>;
};

export async function generateMetadata({ params }: PrintFichaPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getFichaById(id);

  if (result.kind !== "ok") {
    return {
      title: "Imprimir ficha | Fichas Técnicas",
    };
  }

  return {
    title: `Imprimir ${result.ficha.cliente_nome_snapshot} | Fichas Técnicas`,
  };
}

export default async function PrintFichaPage({ params, searchParams }: PrintFichaPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const result = await getFichaById(id);
  const session = await getCurrentSession();

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
        title="Ficha indisponível"
        description="Tente novamente."
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
        description={result.message}
      />
    );
  }

  if (!result.ficha) {
    notFound();
  }

  return (
    <>
      <PrintOnLoad />
      <PrintFicha ficha={result.ficha} includeRawNameList={isTruthyQueryValue(query.listaNomesRaw)} printedBy={session?.user.displayName.split(" ")[0]} />
    </>
  );
}

function isTruthyQueryValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true" || raw === "sim" || raw === "on";
}
