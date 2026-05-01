import type { Metadata } from "next";
import { ClienteDetail } from "@/features/clientes/cliente-detail";
import { getClienteById } from "@/features/clientes/data";

type ClienteDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: ClienteDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getClienteById(id);

  if (result.kind !== "ok") {
    return {
      title: "Cliente | Fichas Técnicas",
    };
  }

  return {
    title: `${result.cliente.nome} | Fichas Técnicas`,
  };
}

export default async function ClienteDetailPage({ params }: ClienteDetailPageProps) {
  const { id } = await params;
  const result = await getClienteById(id);

  return <ClienteDetail result={result} />;
}
