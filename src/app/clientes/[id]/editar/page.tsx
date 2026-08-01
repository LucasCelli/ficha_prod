import { redirect } from "next/navigation";
import { requireAppSession } from "@/features/auth/session";

type EditarClientePageProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Superficie canonica de edicao de cliente e o modal roteavel
 * `/clientes?edit=<id>`. Esta rota permanece apenas como redirecionamento,
 * para nao quebrar links salvos e historico de navegacao.
 */
export default async function EditarClienteRedirect({ params }: EditarClientePageProps) {
  await requireAppSession();
  const { id } = await params;
  redirect(`/clientes?edit=${encodeURIComponent(id)}`);
}
