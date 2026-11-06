import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import jsPDF from "jspdf";
import type { CatalogPrintCategory, CatalogPrintEntry, CatalogPrintSettings } from "./types";
import { catalogPrintSectionLabels } from "./types";

const PAGE = { width: 595.28, height: 841.89, margin: 42 };
const COLORS = { navy: [19, 45, 67] as const, blue: [22, 119, 255] as const, gold: [201, 155, 67] as const, pale: [242, 246, 249] as const, muted: [88, 105, 117] as const, white: [255, 255, 255] as const };

export type CatalogPdfData = { settings: CatalogPrintSettings; categories: CatalogPrintCategory[]; entries: CatalogPrintEntry[] };

export async function generateCatalogPrintPdf(data: CatalogPdfData) {
  validateCatalog(data);
  const entries = orderedEntries(data);
  const tocRowsPerPage = 31;
  const tocPages = Math.max(1, Math.ceil(entries.length / tocRowsPerPage));
  const pageForEntry = (index: number) => 2 + tocPages + index;
  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "pt", compress: true });

  await drawCover(doc, data.settings);
  for (let tocPage = 0; tocPage < tocPages; tocPage += 1) {
    doc.addPage();
    drawToc(doc, entries.slice(tocPage * tocRowsPerPage, (tocPage + 1) * tocRowsPerPage), tocPage * tocRowsPerPage, pageForEntry, data.settings, tocPage + 1, tocPages);
  }
  for (let index = 0; index < entries.length; index += 1) {
    doc.addPage();
    await drawArticle(doc, entries[index], index + 1, entries.length, data.settings);
  }
  doc.addPage();
  await drawBackCover(doc, data.settings);
  return { buffer: Buffer.from(doc.output("arraybuffer")), pageCount: doc.getNumberOfPages(), entryCount: entries.length };
}

export function validateCatalog(data: CatalogPdfData) {
  const active = data.entries.filter((entry) => entry.active);
  if (!active.length) throw new Error("Ative pelo menos um artigo antes de publicar.");
  const categoryMap = new Map(data.categories.filter((category) => category.active).map((category) => [category.id, category]));
  const invalid = active.filter((entry) => !entry.title.trim() || !entry.images.length || !categoryMap.has(entry.category_id) || categoryMap.get(entry.category_id)?.section !== entry.section);
  if (invalid.length) throw new Error(`Revise os artigos sem título, imagem ou categoria ativa: ${invalid.map((entry) => entry.title || entry.id).join(", ")}.`);
}

function orderedEntries(data: CatalogPdfData) {
  const categories = new Map(data.categories.map((category) => [category.id, category]));
  const sectionOrder = { produto: 0, personalizacao: 1 } as const;
  return data.entries.filter((entry) => entry.active).sort((a, b) => {
    const section = sectionOrder[a.section] - sectionOrder[b.section];
    if (section) return section;
    const category = (categories.get(a.category_id)?.sort_order ?? 0) - (categories.get(b.category_id)?.sort_order ?? 0);
    return category || a.sort_order - b.sort_order || a.title.localeCompare(b.title, "pt-BR");
  });
}

async function drawCover(doc: jsPDF, settings: CatalogPrintSettings) {
  fill(doc, COLORS.navy);
  if (isCloudinary(settings.cover_image_url)) {
    const image = await fetchCatalogImage(settings.cover_image_url!, 1400, 1800);
    doc.addImage(image, "JPEG", 0, 0, PAGE.width, PAGE.height, undefined, "FAST");
    doc.setFillColor(9, 28, 43); doc.roundedRect(24, 70, PAGE.width - 48, 300, 10, 10, "F");
  }
  const logo = await loadLogo(settings.logo_url);
  if (logo) doc.addImage(logo.data, logo.format, PAGE.margin, 26, 82, 58, undefined, "FAST");
  doc.setFillColor(...COLORS.gold); doc.rect(PAGE.margin, 126, 72, 5, "F");
  doc.setTextColor(...COLORS.white); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(settings.business_name.toUpperCase(), PAGE.margin, 106);
  doc.setFontSize(38); const titleLines = doc.splitTextToSize(settings.title, PAGE.width - PAGE.margin * 2); doc.text(titleLines, PAGE.margin, 190, { lineHeightFactor: 1.08 });
  if (settings.subtitle) { doc.setFont("helvetica", "normal"); doc.setFontSize(15); doc.text(doc.splitTextToSize(settings.subtitle, PAGE.width - PAGE.margin * 2), PAGE.margin, 190 + titleLines.length * 45 + 16); }
  doc.setFontSize(10); doc.text(`Edição ${new Date().getFullYear()}`, PAGE.margin, PAGE.height - 54);
}

function drawToc(doc: jsPDF, entries: CatalogPrintEntry[], offset: number, pageForEntry: (index: number) => number, settings: CatalogPrintSettings, current: number, total: number) {
  fill(doc, COLORS.white); header(doc, settings.business_name, "Sumário");
  doc.setTextColor(...COLORS.navy); doc.setFont("helvetica", "bold"); doc.setFontSize(25); doc.text("Sumário", PAGE.margin, 112);
  let y = 154; let previousSection = "";
  for (let local = 0; local < entries.length; local += 1) {
    const entry = entries[local]; const globalIndex = offset + local;
    if (entry.section !== previousSection) { previousSection = entry.section; doc.setTextColor(...COLORS.blue); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(catalogPrintSectionLabels[entry.section].toUpperCase(), PAGE.margin, y); y += 17; }
    doc.setTextColor(...COLORS.navy); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text(truncate(doc, entry.title, 420), PAGE.margin, y);
    doc.setDrawColor(205, 213, 219); doc.setLineDashPattern([1, 2], 0); doc.line(PAGE.margin + doc.getTextWidth(truncate(doc, entry.title, 420)) + 7, y - 2, PAGE.width - PAGE.margin - 30, y - 2); doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "bold"); doc.text(String(pageForEntry(globalIndex)), PAGE.width - PAGE.margin, y, { align: "right" }); y += 20;
  }
  footer(doc, `Sumário ${current}/${total}`);
}

async function drawArticle(doc: jsPDF, entry: CatalogPrintEntry, current: number, total: number, settings: CatalogPrintSettings) {
  fill(doc, COLORS.white); header(doc, settings.business_name, catalogPrintSectionLabels[entry.section]);
  const categoryName = entry.category?.name ?? "";
  doc.setTextColor(...COLORS.blue); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(`${catalogPrintSectionLabels[entry.section].toUpperCase()} / ${categoryName.toUpperCase()}`, PAGE.margin, 91);
  doc.setTextColor(...COLORS.navy); doc.setFontSize(27); const titleLines = doc.splitTextToSize(entry.title, PAGE.width - PAGE.margin * 2); doc.text(titleLines, PAGE.margin, 125, { lineHeightFactor: 1.05 });
  const imageTop = 144 + (titleLines.length - 1) * 27; const imageHeight = entry.images.length === 1 ? 330 : 270;
  await drawImages(doc, entry.images.slice(0, 4).map((image) => image.url), PAGE.margin, imageTop, PAGE.width - PAGE.margin * 2, imageHeight);
  let y = imageTop + imageHeight + 28;
  if (entry.description) { doc.setTextColor(...COLORS.navy); doc.setFont("helvetica", "normal"); doc.setFontSize(11.5); const lines = doc.splitTextToSize(entry.description, PAGE.width - PAGE.margin * 2); doc.text(lines.slice(0, 7), PAGE.margin, y, { lineHeightFactor: 1.45 }); y += Math.min(lines.length, 7) * 17 + 17; }
  if (entry.highlights.length) {
    doc.setFillColor(...COLORS.pale); const available = Math.max(82, PAGE.height - y - 82); doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, available, 8, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...COLORS.navy); doc.text("DESTAQUES", PAGE.margin + 16, y + 24);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); let rowY = y + 47;
    for (const highlight of entry.highlights.slice(0, 8)) { doc.setFillColor(...COLORS.gold); doc.circle(PAGE.margin + 19, rowY - 3, 2.5, "F"); doc.setTextColor(...COLORS.navy); doc.text(truncate(doc, highlight, PAGE.width - PAGE.margin * 2 - 48), PAGE.margin + 31, rowY); rowY += 21; }
  }
  footer(doc, `${current} de ${total}`);
}

async function drawImages(doc: jsPDF, urls: string[], x: number, y: number, width: number, height: number) {
  const gap = 8; const columns = urls.length === 1 ? 1 : 2; const rows = Math.ceil(urls.length / columns); const cellWidth = (width - gap * (columns - 1)) / columns; const cellHeight = (height - gap * (rows - 1)) / rows;
  const fetched = await Promise.all(urls.map((url) => fetchCatalogImage(url, 1400, 1000)));
  fetched.forEach((image, index) => { const column = index % columns; const row = Math.floor(index / columns); doc.addImage(image, "JPEG", x + column * (cellWidth + gap), y + row * (cellHeight + gap), cellWidth, cellHeight, undefined, "FAST"); });
}

async function drawBackCover(doc: jsPDF, settings: CatalogPrintSettings) {
  fill(doc, COLORS.navy); doc.setFillColor(...COLORS.gold); doc.rect(PAGE.margin, 172, 72, 5, "F"); doc.setTextColor(...COLORS.white); doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text(settings.business_name, PAGE.margin, 224);
  const logo = await loadLogo(settings.logo_url);
  if (logo) doc.addImage(logo.data, logo.format, PAGE.margin, 64, 100, 70, undefined, "FAST");
  if (settings.footer_text) { doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.text(doc.splitTextToSize(settings.footer_text, PAGE.width - PAGE.margin * 2), PAGE.margin, 270, { lineHeightFactor: 1.4 }); }
  const contacts = [["WhatsApp", settings.whatsapp], ["Instagram", settings.instagram], ["E-mail", settings.email], ["Endereço", settings.address]].filter((item): item is [string, string] => Boolean(item[1]));
  let y = 430; for (const [label, text] of contacts) { doc.setTextColor(...COLORS.gold); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(label.toUpperCase(), PAGE.margin, y); doc.setTextColor(...COLORS.white); doc.setFontSize(13); doc.text(doc.splitTextToSize(text, PAGE.width - PAGE.margin * 2), PAGE.margin, y + 20); y += 64; }
}

async function loadLogo(value: string | null | undefined): Promise<{ data: Uint8Array; format: "JPEG" | "PNG" } | null> {
  if (isCloudinary(value)) return { data: await fetchCatalogImage(value, 900, 640), format: "JPEG" };
  if (!value || value === "/priscila_logo.svg" || value === "/priscila_logo.png") {
    return { data: new Uint8Array(await readFile(join(process.cwd(), "public", "priscila_logo_white.png"))), format: "PNG" };
  }
  return null;
}

async function fetchCatalogImage(url: string, width: number, height: number) {
  if (!isCloudinary(url)) throw new Error("Uma imagem do catálogo não está hospedada no Cloudinary.");
  const transformed = url.replace("/image/upload/", `/image/upload/c_fill,g_auto,w_${width},h_${height},f_jpg,q_auto:good/`);
  const response = await fetch(transformed, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Não foi possível carregar uma imagem do artigo (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

function isCloudinary(value: string | null | undefined): value is string { if (!value) return false; try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && url.pathname.includes("/image/upload/"); } catch { return false; } }
function fill(doc: jsPDF, color: readonly [number, number, number]) { doc.setFillColor(...color); doc.rect(0, 0, PAGE.width, PAGE.height, "F"); }
function header(doc: jsPDF, businessName: string, section: string) { doc.setTextColor(...COLORS.muted); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(businessName.toUpperCase(), PAGE.margin, 42); doc.text(section.toUpperCase(), PAGE.width - PAGE.margin, 42, { align: "right" }); doc.setDrawColor(220, 226, 230); doc.line(PAGE.margin, 55, PAGE.width - PAGE.margin, 55); }
function footer(doc: jsPDF, text: string) { doc.setTextColor(...COLORS.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(text, PAGE.width - PAGE.margin, PAGE.height - 24, { align: "right" }); }
function truncate(doc: jsPDF, value: string, width: number) { if (doc.getTextWidth(value) <= width) return value; let output = value; while (output.length && doc.getTextWidth(`${output}…`) > width) output = output.slice(0, -1); return `${output}…`; }
