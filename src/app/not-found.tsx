import Link from "next/link";
import { StatusPanel } from "@/components/ui";

export default function NotFound() {
  return (
    <StatusPanel
      actions={
        <Link className="ui-button ui-button--secondary" href="/">
          Voltar ao início
        </Link>
      }
      description="A rota solicitada não faz parte da nova aplicação."
      eyebrow="404"
      title="Página não encontrada"
      tone="info"
    />
  );
}
