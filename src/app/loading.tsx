export default function Loading() {
  return (
    <section className="app-loading" aria-label="Carregando" aria-live="polite">
      <span className="app-loading__spinner" aria-hidden="true" />
      <p>Carregando…</p>
    </section>
  );
}
