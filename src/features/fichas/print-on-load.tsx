"use client";

import { useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function PrintOnLoad() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autoprint") === "0") {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      const element = document.getElementById("print-version");
      if (!element) return;

      try {
        // Adjust width based on height like legacy
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

        await new Promise(resolve => setTimeout(resolve, 100)); // wait for layout

        // Set width to A4 width in px to maximize width
        element.style.width = '794px';

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
        const contentWidth = pageWidth - (6 * 2); // margin 6mm
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

        // Print using iframe method
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
                // Remove after time — do not use afterprint
                setTimeout(() => {
                  iframe.remove();
                  URL.revokeObjectURL(blobUrl);
                }, 300000); // 5 minutes
              }
            } catch (error) {
              console.error('Print failed:', error);
              iframe.remove();
              URL.revokeObjectURL(blobUrl);
            }
          }, 500);
        }, { once: true });

        document.body.appendChild(iframe);
        iframe.src = blobUrl;
      } catch (error) {
        console.error("Error generating PDF:", error);
        // Fallback to browser print
        window.print();
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
