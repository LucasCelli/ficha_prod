"use client";

import { Printer } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { FichaDetail } from "./data";
import { PrintFicha } from "./print-ficha";
import { printElementToPdf } from "./print-pdf";
import { PrintTriggerButton } from "./print-trigger-button";

type FichaPrintPreviewShellProps = {
  children: ReactNode;
  printHref: string;
};

type FichaPrintPreviewContentProps = {
  ficha: FichaDetail;
};

const PREVIEW_PRINT_TOAST_ID = "ficha-print-preview";

export function FichaPrintPreviewShell({ children, printHref }: FichaPrintPreviewShellProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  async function handlePrint(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const element = document.getElementById("print-version");
    if (!element) {
      toast.error("Falha ao imprimir", {
        description: "A prévia de impressão não foi encontrada.",
      });
      return;
    }

    setIsPrinting(true);
    toast.loading("Impressão", {
      description: "Montando o PDF da ficha.",
      duration: Infinity,
      id: PREVIEW_PRINT_TOAST_ID,
    });

    try {
      await printElementToPdf(element);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Falha ao imprimir", {
        description: "Não foi possível gerar o PDF desta ficha.",
      });
    } finally {
      toast.dismiss(PREVIEW_PRINT_TOAST_ID);
      setIsPrinting(false);
    }
  }

  return (
    <section className="ficha-print-preview" aria-label="Prévia de impressão">
      <header className="ficha-print-preview__header">
        <div className="ficha-print-preview__title">
          <span>Prévia de impressão</span>
          <h2>Imprimir ficha</h2>
        </div>
        <PrintTriggerButton
          className="ui-button ui-button--primary"
          disabled={isPrinting}
          href={printHref}
          label="Imprimir ficha"
          onClick={handlePrint}
        >
          <Printer aria-hidden="true" size={18} />
          {isPrinting ? "Gerando PDF..." : "Imprimir"}
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
        <span className="button-spinner button-spinner--contrast" aria-hidden="true" />
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
