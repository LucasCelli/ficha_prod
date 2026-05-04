import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PRINT_RENDER_WIDTH_PX = 794;
const PRINT_RENDER_SCALE = 1.6;
const PRINT_PAGE_MARGIN_MM = 6;
const PRINT_FRAME_CLEANUP_MS = 60_000;
const PRINT_FRAME_LOAD_TIMEOUT_MS = 15_000;

type ManagedStyle = Pick<CSSStyleDeclaration, "height" | "margin" | "maxHeight" | "minHeight" | "overflow" | "padding" | "width">;

type ManagedFrame = {
  dispose: () => void;
  iframe: HTMLIFrameElement;
};

export async function printElementToPdf(element: HTMLElement) {
  const blobUrl = await renderElementToPdfUrl(element);

  try {
    await openPdfInPrintFrame(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function renderElementToPdfUrl(element: HTMLElement) {
  const canvas = await capturePrintCanvas(element);
  const pdf = new jsPDF({
    compress: true,
    format: "a4",
    orientation: "portrait",
    unit: "mm",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PRINT_PAGE_MARGIN_MM * 2;
  const contentHeight = pageHeight - PRINT_PAGE_MARGIN_MM * 2;
  const pxToMm = 25.4 / 96;

  let renderWidth = canvas.width * pxToMm;
  let renderHeight = canvas.height * pxToMm;
  const fitScale = Math.min(contentWidth / renderWidth, contentHeight / renderHeight, 1);

  renderWidth *= fitScale;
  renderHeight *= fitScale;

  if (renderWidth > 0 && renderHeight > 0) {
    const offsetX = (pageWidth - renderWidth) / 2;
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.9),
      "JPEG",
      offsetX,
      PRINT_PAGE_MARGIN_MM,
      renderWidth,
      renderHeight,
      undefined,
      "FAST",
    );
  } else {
    pdf.text("Ficha em branco ou sem conteúdo para imprimir", 10, 20);
  }

  return URL.createObjectURL(pdf.output("blob"));
}

async function capturePrintCanvas(element: HTMLElement) {
  return withPreparedPrintElement(element, async () =>
    html2canvas(element, {
      backgroundColor: "#ffffff",
      logging: false,
      scale: PRINT_RENDER_SCALE,
      useCORS: true,
    }),
  );
}

async function withPreparedPrintElement<T>(element: HTMLElement, run: () => Promise<T>) {
  const originalStyle: ManagedStyle = {
    height: element.style.height,
    margin: element.style.margin,
    maxHeight: element.style.maxHeight,
    minHeight: element.style.minHeight,
    overflow: element.style.overflow,
    padding: element.style.padding,
    width: element.style.width,
  };

  element.style.height = "auto";
  element.style.margin = "0 auto";
  element.style.maxHeight = "none";
  element.style.minHeight = "0";
  element.style.overflow = "visible";
  element.style.padding = "0";
  element.style.width = `${PRINT_RENDER_WIDTH_PX}px`;

  try {
    await waitForLayout();
    return await run();
  } finally {
    restoreElementStyle(element, originalStyle);
  }
}

function restoreElementStyle(element: HTMLElement, style: ManagedStyle) {
  element.style.height = style.height;
  element.style.margin = style.margin;
  element.style.maxHeight = style.maxHeight;
  element.style.minHeight = style.minHeight;
  element.style.overflow = style.overflow;
  element.style.padding = style.padding;
  element.style.width = style.width;
}

function waitForLayout() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 100);
  });
}

async function openPdfInPrintFrame(blobUrl: string) {
  const { dispose, iframe } = createPrintFrame();

  try {
    await waitForFrameLoad(iframe, blobUrl);

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      throw new Error("Janela de impressão indisponível.");
    }

    frameWindow.focus();
    frameWindow.print();
  } finally {
    window.setTimeout(dispose, PRINT_FRAME_CLEANUP_MS);
  }
}

function createPrintFrame(): ManagedFrame {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0.01;";
  document.body.appendChild(iframe);

  return {
    dispose: () => iframe.remove(),
    iframe,
  };
}

function waitForFrameLoad(iframe: HTMLIFrameElement, blobUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao carregar a impressão."));
    }, PRINT_FRAME_LOAD_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeout);
      iframe.removeEventListener("error", handleError);
      iframe.removeEventListener("load", handleLoad);
    }

    function handleLoad() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error("Falha ao carregar a impressão."));
    }

    iframe.addEventListener("load", handleLoad, { once: true });
    iframe.addEventListener("error", handleError, { once: true });
    iframe.src = blobUrl;
  });
}
