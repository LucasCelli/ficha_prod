import type { Metadata } from "next";
import { RouteToast, type RouteToastMessage } from "@/components/ui/route-toast";
import { ClienteDetail } from "@/features/clientes/cliente-detail";
import { getClienteById } from "@/features/clientes/data";

type ClienteDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

  return (
    <>
      <RouteToast messages={clienteToastMessages} paramName="toast" />
      <ClienteDetail result={result} />
    </>
  );
}

const clienteToastMessages: Record<string, RouteToastMessage> = {
  "cliente-created": {
    description: "O cliente foi cadastrado.",
    title: "Cliente salvo",
    tone: "success",
  },
  "cliente-updated": {
    description: "As alterações foram salvas.",
    title: "Cliente atualizado",
    tone: "success",
  },
};
