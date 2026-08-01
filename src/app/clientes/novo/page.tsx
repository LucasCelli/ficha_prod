import { redirect } from "next/navigation";
import { requireAppSession } from "@/features/auth/session";

/**
 * Superficie canonica de cadastro de cliente e o modal roteavel
 * `/clientes?modal=novo`. Esta rota permanece apenas como redirecionamento,
 * para nao quebrar links salvos e historico de navegacao.
 */
export default async function NovoClienteRedirect() {
  await requireAppSession();
  redirect("/clientes?modal=novo");
}
