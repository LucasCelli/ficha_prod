"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <section className="status-panel status-panel--danger" aria-labelledby="status-panel-title">
      <div className="status-panel__marker" aria-hidden="true" />
      <div className="status-panel__content">
        <p className="status-panel__eyebrow">Erro</p>
        <h1 id="status-panel-title" className="status-panel__title">
          Nao foi possivel continuar
        </h1>
        <p className="status-panel__description">
          {error.digest ? `Codigo de referencia: ${error.digest}` : "A tela nao pode ser carregada agora."}
        </p>
        <div className="status-panel__actions">
          <button className="ui-button ui-button--secondary" onClick={reset} type="button">
            Tentar novamente
          </button>
        </div>
      </div>
    </section>
  );
}
