const CONTENT_WIDTH_MM = 198;
const CONTENT_HEIGHT_MM = 285;
const PX_PER_MM = 96 / 25.4;

// Shared layout for measurement and the printed document.
const DOCUMENT_STYLE = `
  @page { size: A4 portrait; margin: 6mm; }
  html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
  .print-document { display: block !important; width: 198mm !important; }
  .print-container { width: 198mm !important; max-width: none !important;
    height: auto !important; min-height: 0 !important; max-height: none !important;
    margin: 0 !important; padding: 0 !important; overflow: visible !important;
    color: black; --color-text: #000; --color-text-secondary: #000; --color-muted: #000; }
  .print-page { break-after: auto !important; page-break-after: auto !important; }
  .print-page + .print-page { break-before: page; page-break-before: always; }
  .print-card, .print-table, .print-table th, .print-table td { border-color: black; }
  .print-raster-page { display: flex !important; align-items: flex-start; }
  .print-raster-page img { display: block; margin: 0 auto; }
  .print-direct .print-container,
  .print-direct .print-header h1, .print-direct .print-header p,
  .print-direct .print-card h2, .print-direct .print-table,
  .print-direct .print-total, .print-direct .print-observacoes,
  .print-direct .print-raw-name-list-page pre { font-size: 13px; }
  .print-direct .print-total-produtos, .print-direct .print-image-description { font-size: 10px; }
  .print-direct .print-raw-name-list-page h2 { font-size: 15px; }
  .print-direct .print-raw-name-list-page p { font-size: 11px; }
`;

export async function printFichaAutomatically(element: HTMLElement, onFinished?: () => void) {
  const frame = document.createElement("iframe");
  frame.title = "Impressão da ficha";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;";
  document.body.appendChild(frame);
  let cleanupTimer: number | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(cleanupTimer);
    frame.remove();
    onFinished?.();
  };

  try {
    const doc = frame.contentDocument;
    const frameWindow = frame.contentWindow;
    if (!doc || !frameWindow) throw new Error("Janela de impressão indisponível.");
    doc.documentElement.className = document.documentElement.className;
    // next/font defines its variables on body, rather than on html.
    doc.body.className = document.body.className;
    const sourceStyle = getComputedStyle(element);
    doc.body.style.fontFamily = sourceStyle.fontFamily;
    for (const property of ["--font-sans", "--font-mono", "--font-serif-display"]) {
      const value = sourceStyle.getPropertyValue(property);
      if (value.trim()) doc.body.style.setProperty(property, value);
    }
    doc.title = document.title;
    const base = doc.createElement("base");
    base.href = document.baseURI;
    doc.head.appendChild(base);
    const styleLoads: Promise<void>[] = [];
    for (const source of document.querySelectorAll('style, link[rel="stylesheet"]')) {
      const copy = source.cloneNode(true) as HTMLElement;
      if (copy.tagName === "LINK") {
        styleLoads.push(new Promise((resolve, reject) => {
          copy.onload = () => resolve();
          copy.onerror = () => reject(new Error("Falha ao carregar estilos de impressão."));
        }));
      }
      doc.head.appendChild(copy);
    }
    const style = doc.createElement("style");
    style.textContent = DOCUMENT_STYLE;
    doc.head.appendChild(style);
    const copy = element.cloneNode(true) as HTMLElement;
    copy.classList.add("print-direct");
    doc.body.appendChild(copy);
    for (const image of copy.querySelectorAll("img")) image.loading = "eager";
    await Promise.all(styleLoads);
    // Force layout to request the fonts used by both regular and bold text
    // before reading fonts.ready (which otherwise may resolve too early).
    copy.getBoundingClientRect();
    await doc.fonts.ready;
    await waitForImages(copy);
    await new Promise<void>((resolve) => frameWindow.requestAnimationFrame(() => frameWindow.requestAnimationFrame(() => resolve())));

    const mainPage = copy.querySelector<HTMLElement>(":scope > .print-page:not(.print-raw-name-list-page)") ?? copy;
    const height = mainPage.getBoundingClientRect().height;
    if (height > CONTENT_HEIGHT_MM * PX_PER_MM) {
      try {
        copy.classList.remove("print-direct");
        const captureHeight = mainPage.getBoundingClientRect().height;
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(mainPage, {
          backgroundColor: "#ffffff", logging: false, scale: 1.6, useCORS: true,
          windowWidth: 794, windowHeight: Math.ceil(captureHeight),
        });
        if (!canvas.width || !canvas.height) throw new Error("Captura vazia.");
        const scale = Math.min(CONTENT_WIDTH_MM / canvas.width, CONTENT_HEIGHT_MM / canvas.height);
        const raster = doc.createElement("div");
        raster.className = "print-page print-raster-page";
        const image = doc.createElement("img");
        image.alt = "Ficha ajustada para uma página";
        image.style.width = `${canvas.width * scale}mm`;
        image.style.height = `${canvas.height * scale}mm`;
        image.src = canvas.toDataURL("image/jpeg", 0.9);
        raster.appendChild(image);
        mainPage.replaceWith(raster);
        await waitForImages(raster);
      } catch (error) {
        copy.classList.add("print-direct");
        console.error("Falha ao ajustar ficha; usando impressão direta.", error);
      }
    }

    frameWindow.addEventListener("afterprint", dispose, { once: true });
    // Safety net for browsers that omit afterprint, after preparation completes.
    cleanupTimer = window.setTimeout(dispose, 60_000);
    frameWindow.focus();
    frameWindow.print();
  } catch (error) {
    dispose();
    throw error;
  }
}

async function waitForImages(element: HTMLElement) {
  await Promise.all(Array.from(element.querySelectorAll("img"), async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }
    if (image.naturalWidth > 0) await image.decode().catch(() => undefined);
  }));
}
