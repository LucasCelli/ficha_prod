import { LoaderCircle, Printer } from "lucide-react";
import type { ReactNode } from "react";
import type { FichaDetail } from "./data";
import { PrintFicha } from "./print-ficha";
import { PrintTriggerButton } from "./print-trigger-button";

type FichaPrintPreviewShellProps = {
  children: ReactNode;
  printHref: string;
};

type FichaPrintPreviewContentProps = {
  ficha: FichaDetail;
};

export function FichaPrintPreviewShell({ children, printHref }: FichaPrintPreviewShellProps) {
  return (
    <section className="ficha-print-preview" aria-label="Prévia de impressão">
      <header className="ficha-print-preview__header">
        <div className="ficha-print-preview__title">
          <span>Prévia de impressão</span>
          <h2>Imprimir ficha</h2>
        </div>
        <PrintTriggerButton className="ui-button ui-button--primary" href={printHref} label="Imprimir ficha">
          <Printer aria-hidden="true" size={18} />
          Imprimir
        </PrintTriggerButton>
      </header>
      {children}
    </section>
  );
}

export function FichaPrintPreviewContent({ ficha }: FichaPrintPreviewContentProps) {
  return (
    <div className="ficha-print-preview__body">
      <PrintFicha ficha={ficha} />
    </div>
  );
}

export function FichaPrintPreviewLoading() {
  return (
    <div className="ficha-print-preview__body ficha-print-preview__body--loading" role="status" aria-live="polite">
      <div className="ficha-print-preview__loading">
        <LoaderCircle aria-hidden="true" size={18} />
        Carregando prévia
      </div>
      <div className="ficha-print-preview__skeleton" aria-hidden="true" />
    </div>
  );
}

export function FichaPrintPreviewError() {
  return (
    <div className="ficha-print-preview__body ficha-print-preview__body--empty">
      <div className="ficha-print-preview__empty">
        <h3>Ficha indisponível</h3>
        <p>Não foi possível carregar esta ficha para impressão.</p>
      </div>
    </div>
  );
}
