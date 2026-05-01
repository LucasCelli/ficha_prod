"use client";

import "@/styles/globals.css";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  return (
    <html data-theme="light" lang="pt-BR">
      <body>
        <main className="app-shell" id="conteudo">
          <section className="status-panel status-panel--danger" role="alert">
            <div className="status-panel__content">
              <p className="status-panel__eyebrow">Erro</p>
              <h1>Nao foi possivel continuar</h1>
              <p>{error.digest ? `Codigo de referencia: ${error.digest}` : "A aplicacao nao pode ser carregada agora."}</p>
              <button className="ui-button ui-button--secondary" onClick={reset} type="button">
                Tentar novamente
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
