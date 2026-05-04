"use client";

import { LoaderCircle, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  const [isPrinting, setIsPrinting] = useState(false);

  async function handlePrint(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const element = document.getElementById("print-version");
    if (!element) return;

    setIsPrinting(true);
    // Safety timeout to reset loading state
    const safetyTimeout = setTimeout(() => setIsPrinting(false), 10000);
    try {
      const originalWidth = element.style.width;
      const originalMargin = element.style.margin;
      const originalPadding = element.style.padding;
      const originalHeight = element.style.height;
      const originalMinHeight = element.style.minHeight;
      const originalMaxHeight = element.style.maxHeight;
      const originalOverflow = element.style.overflow;

      element.style.margin = '0 auto';
      element.style.padding = '0';
      element.style.height = 'auto';
      element.style.minHeight = '0';
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';

      await new Promise(resolve => setTimeout(resolve, 100));

      // Set width to A4 width in px to maximize width
      element.style.width = '794px';

      const toastId = toast.loading("Carregando Impressão");

        const canvas = await html2canvas(element, {
          scale: 1.6,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });



        const imgData = canvas.toDataURL("image/jpeg", 0.9);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (6 * 2);
      const contentHeight = pageHeight - (6 * 2);

      const pxToMm = 25.4 / 96;
      let renderWidth = canvas.width * pxToMm;
      let renderHeight = canvas.height * pxToMm;
      const fitScale = Math.min(contentWidth / renderWidth, contentHeight / renderHeight, 1);
      renderWidth *= fitScale;
      renderHeight *= fitScale;

        const offsetX = (pageWidth - renderWidth) / 2;
        const offsetY = 6; // Always place at top

        if (renderWidth > 0 && renderHeight > 0) {
          pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
        } else {
          pdf.text("Ficha em branco ou sem conteúdo para imprimir", 10, 20);
        }

        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);

        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0.01;';

        iframe.addEventListener('load', () => {
          setTimeout(() => {
            try {
              const frameWindow = iframe.contentWindow;
              if (frameWindow) {
                frameWindow.focus();
                frameWindow.print();
                toast.dismiss(toastId);
                // Remove after time — do not use afterprint
                setTimeout(() => {
                  iframe.remove();
                  URL.revokeObjectURL(blobUrl);
                }, 300000); // 5 minutes
              }
            } catch (error) {
              console.error('Print failed:', error);
              toast.dismiss(toastId);
              iframe.remove();
              URL.revokeObjectURL(blobUrl);
            }
          }, 500);
        }, { once: true });

        document.body.appendChild(iframe);
        iframe.src = blobUrl;
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      clearTimeout(safetyTimeout);
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
