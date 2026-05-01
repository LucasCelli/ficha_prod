"use client";

import { Button, StatusPanel } from "@/components/ui";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <StatusPanel
      actions={
        <Button onClick={reset} variant="secondary">
          Tentar novamente
        </Button>
      }
      description={error.digest ? `Código de referência: ${error.digest}` : "A tela não pôde ser carregada agora."}
      eyebrow="Erro"
      title="Não foi possível continuar"
      tone="danger"
    />
  );
}
