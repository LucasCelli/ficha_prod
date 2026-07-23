import type { UniformListItem } from "@/lib/ai/schemas/uniform-list";

const MODEL_LABELS: Record<string, string> = {
  baby_look: "Baby Look",
  desconhecido: "Desconhecido",
  infantil: "Infantil",
  polo: "Polo",
  regata: "Regata",
  tradicional: "Camiseta",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  alta: "Alta",
  baixa: "Baixa",
  media: "Media",
};

function displayValue(value: string | null | undefined) {
  return value && value.length > 0 ? value : "-";
}

function formatModel(value: string) {
  return MODEL_LABELS[value] ?? value;
}

function formatConfidence(value: string) {
  return CONFIDENCE_LABELS[value] ?? value;
}

function escapeHtml(value: string | null | undefined) {
  return displayValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type UniformListPrintInput = {
  items: UniformListItem[];
  label: string;
  rawText: string;
  showGroup: boolean;
  title: string;
  tipo: "bruta" | "organizada";
};

export function buildUniformListPrintHtml(input: UniformListPrintInput) {
  const body =
    input.tipo === "organizada"
      ? `
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Numero</th>
              <th>Tamanho</th>
              <th>Modelo</th>
              <th>Confianca</th>
              ${input.showGroup ? "<th>Grupo</th>" : ""}
              <th>Observacao</th>
            </tr>
          </thead>
          <tbody>
            ${input.items
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.nome)}</td>
                    <td>${escapeHtml(item.numero)}</td>
                    <td>${escapeHtml(item.tamanho)}</td>
                    <td>${escapeHtml(formatModel(item.modelo))}</td>
                    <td>${escapeHtml(formatConfidence(item.confianca))}</td>
                    ${input.showGroup ? `<td>${escapeHtml(item.grupo)}</td>` : ""}
                    <td>${escapeHtml(item.observacao)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      `
      : `<pre>${escapeHtml(input.rawText)}</pre>`;

  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(input.title)}</title>
        <style>
          @page { margin: 12mm; }
          * { box-sizing: border-box; }
          body { color: #111827; font-family: Arial, sans-serif; font-size: 12px; margin: 0; }
          header { display: grid; gap: 4px; margin-bottom: 12px; }
          header span { color: #4b5563; font-size: 11px; font-weight: 700; }
          h1 { font-size: 18px; line-height: 1.2; margin: 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 6px 7px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; }
          td:nth-child(2), td:nth-child(3), td:nth-child(5) { text-align: center; }
          pre { border: 1px solid #d1d5db; font-family: "Courier New", monospace; font-size: 12px; line-height: 1.45; margin: 0; padding: 10px; white-space: pre-wrap; word-break: break-word; }
        </style>
      </head>
      <body>
        <header>
          <span>${escapeHtml(input.label)}</span>
          <h1>${escapeHtml(input.title)}</h1>
        </header>
        ${body}
      </body>
    </html>`;
}

/** Renders the list in a hidden iframe and triggers the print dialog. Returns false if it could not open. */
export function printUniformList(input: UniformListPrintInput): boolean {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.inset = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";

  document.body.appendChild(frame);
  const printDocument = frame.contentDocument;
  const printWindow = frame.contentWindow;

  if (!printDocument || !printWindow) {
    frame.remove();
    return false;
  }

  printDocument.open();
  printDocument.write(buildUniformListPrintHtml(input));
  printDocument.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => frame.remove(), 500);
  }, 50);

  return true;
}
