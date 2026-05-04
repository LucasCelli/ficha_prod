import { LoadingBar } from "@/components/ui/loading-bar";

export default function Loading() {
  return (
    <section className="app-loading" aria-label="Carregando" aria-live="polite">
      <LoadingBar className="app-loading__bar" size="lg" />
    </section>
  );
}
