import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui";
import { sanitizeObservationHtml } from "@/lib/sanitize-observations";
import { getFichaById } from "@/features/fichas/data";
import { PrintFicha } from "@/features/fichas/print-ficha";
import { PrintBlockedNotice, PrintOnLoad } from "@/features/fichas/print-on-load";
import { isMissingRequiredLayout, MISSING_LAYOUT_MESSAGE } from "@/features/fichas/print-requirements";
import { requireAppSession } from "@/features/auth/session";

type PrintFichaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    listaNomesRaw?: string | string[];
    somenteListaNomes?: string | string[];
  }>;
};

export async function generateMetadata({ params }: PrintFichaPageProps): Promise<Metadata> {
  await requireAppSession();
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
  const session = await requireAppSession();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const result = await getFichaById(id);

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

  const onlyRawNameList = isTruthyQueryValue(query.somenteListaNomes);

  if (!onlyRawNameList && isMissingRequiredLayout(result.ficha.arte, result.ficha.imagens.length)) {
    return (
      <>
        <PrintBlockedNotice message={MISSING_LAYOUT_MESSAGE} />
        <EmptyState
          actions={
            <Link className="ui-button ui-button--secondary" href={`/fichas/${encodeURIComponent(id)}`}>
              Editar ficha
            </Link>
          }
          title="Layout obrigatório"
          description={MISSING_LAYOUT_MESSAGE}
        />
      </>
    );
  }

  return (
    <>
      <PrintOnLoad />
      <PrintFicha
        fallbackAuthor={session?.user.displayName}
        ficha={result.ficha}
        includeRawNameList={isTruthyQueryValue(query.listaNomesRaw)}
        onlyRawNameList={onlyRawNameList}
        observationHtml={sanitizeObservationHtml(result.ficha.observacoes || result.ficha.observacoes_html || "Nenhuma")}
      />
    </>
  );
}

function isTruthyQueryValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true" || raw === "sim" || raw === "on";
}
