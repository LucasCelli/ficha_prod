import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import {
  ArrowLeftRight,
  Boxes,
  CalendarCheck,
  CalendarDays,
  Circle,
  ClipboardList,
  FileText,
  GripHorizontal,
  Hash,
  Image as ImageIcon,
  Layers,
  List,
  MapPin,
  Paintbrush,
  Palette,
  Ruler,
  Settings,
  Shield,
  ShieldHalf,
  Shirt,
  SlidersHorizontal,
  Spline,
  Star,
  Tag,
  User,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { FichaDetail } from "./data";

type PrintFichaProps = {
  ficha: FichaDetail;
  printedBy?: string;
};

type PrintProductRow = {
  colorClass: string;
  detalhes: string;
  produto: string;
  quantidade: number;
  tamanho: string;
};

const BUSINESS_TIME_ZONE = "America/Cuiaba";
const MAX_PRINT_IMAGES = 4;

export function PrintFicha({ ficha, printedBy }: PrintFichaProps) {
  const products = buildProductRows(ficha);
  const productSummary = buildProductSummary(products);
  const hasDetails = products.some((p) => p.detalhes && p.detalhes.trim() !== "-" && p.detalhes.trim() !== "");
  const imageClassNames = getImagesClassNames(ficha.imagens.length);
  const shortId = String(parseInt(ficha.id.split("-")[0], 16) % 10000).padStart(4, "0");
  const idText = printedBy ? `Ficha #${shortId} por ${printedBy}` : `Ficha #${shortId}`;
  const isEvento = Boolean(ficha.evento);
  const isRegata = ficha.itens.length > 0 && ficha.itens.every((item) => isRegataProduct(item.produto ?? ""));
  const isPolo = ficha.gola === "polo" || ficha.gola === "v_polo";
  const isSocial = ficha.gola === "social";
  const hasMangaExtra = hasAcabamentoMangaExtra(ficha.acabamento_manga);
  const hasReforco = Boolean(ficha.gola && !isSocial && ficha.reforco_gola === "sim");
  const hasAbertura = Boolean(isPolo && ficha.abertura_lateral === "sim");
  const hasFilete = ficha.filete === "sim";
  const hasFaixa = ficha.faixa === "sim";

  return (
    <section className="ficha-print-page" aria-label={`Ficha imprimível de ${ficha.cliente_nome_snapshot}`}>
      <div id="print-version" className="print-container">
        <header id="printHeader" className="print-header">
          <h1>Ficha Técnica | Priscila Confecções & Uniformes</h1>
          <p>
            Data de Emissão: <span>{formatDateTime(new Date())}</span>
            <span> | {idText}</span>
          </p>
        </header>

        <section className="print-card">
          <h2>
            <ClipboardList aria-hidden="true" size={16} /> Dados do Pedido
          </h2>
          <div className="print-grid">
            <PrintField icon={User} label="Cliente" value={formatCliente(ficha)} />
            <PrintField forceShow icon={Hash} label="Nº Venda" value={ficha.numero_venda} />
            <PrintField icon={UserRound} label="Vendedor" value={ficha.vendedor} />
            <PrintField danger={isEvento} icon={CalendarCheck} label="Entrega" strong value={formatDate(ficha.data_entrega)} />
            <PrintField icon={CalendarDays} label="Início" muted={isEvento} value={formatDate(ficha.data_inicio)} />
            <PrintField danger={isEvento} icon={Star} label="Evento" value={isEvento ? "EVENTO" : "Não"} />
          </div>
        </section>

        <div className="print-two-cols">
          <section className="print-card">
            <h2>
              <Boxes aria-hidden="true" size={16} /> Produtos
            </h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>TAM.</th>
                  <th>QTD.</th>
                  <th>PRODUTO</th>
                  {hasDetails ? <th>DETALHES</th> : null}
                </tr>
              </thead>
              <tbody>
                {products.map((item, index) => (
                  <tr key={`${item.tamanho}-${item.produto}-${index}`}>
                    <td>{item.tamanho || "-"}</td>
                    <td>{item.quantidade || "-"}</td>
                    <td className={item.colorClass ? `print-product-color ${item.colorClass}` : undefined}>{item.produto || "-"}</td>
                    {hasDetails ? (
                      <td className={item.colorClass && productSummary.useDetailsColor ? `print-product-color ${item.colorClass}` : undefined}>
                        {item.detalhes || "-"}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {productSummary.text ? <div className="print-total-produtos">{productSummary.text}</div> : null}
            <div className="print-total">
              Total de Itens: <span>{products.reduce((total, item) => total + item.quantidade, 0)}</span>
            </div>
          </section>

          <section className="print-card">
            <h2>
              <Settings aria-hidden="true" size={16} /> Especificações Técnicas
            </h2>
            <div className="print-grid-single">
              <PrintField icon={Layers} label="Material" value={ficha.material} />
              <PrintField icon={Palette} label="Cor Material" value={ficha.cor_material} />

              <PrintSeparator />

              <PrintField icon={Shirt} label="Tipo Manga" value={ficha.manga} />
              <PrintField icon={SlidersHorizontal} label={isRegata ? "Viés" : "Acab. Manga"} value={isRegata ? yesNo(ficha.acabamento_manga === "vies") : ficha.acabamento_manga} />
              {hasMangaExtra && ficha.largura_manga ? (
                <PrintField icon={Ruler} label={isRegata ? "Largura do Viés" : "Largura Acab. Manga"} value={ficha.largura_manga} />
              ) : null}
              {hasMangaExtra && ficha.cor_acabamento_manga ? (
                <PrintField icon={Palette} label={isRegata ? "Cor do Viés" : "Cor Acab. Manga"} value={ficha.cor_acabamento_manga} />
              ) : null}

              <PrintSeparator />

              <PrintField icon={Circle} label="Tipo Gola" value={ficha.gola} />
              {ficha.gola && !isSocial && ficha.cor_gola ? <PrintField icon={Palette} label="Cor da Gola" value={ficha.cor_gola} /> : null}
              {!isPolo && !isSocial && ficha.acabamento_gola ? <PrintField icon={SlidersHorizontal} label="Acab. Gola" value={ficha.acabamento_gola} /> : null}
              {!isPolo && !isSocial && ficha.largura_gola ? <PrintField icon={Ruler} label="Largura Acab. Gola" value={ficha.largura_gola} /> : null}
              {hasReforco ? <PrintField icon={ShieldHalf} label="Reforço na Gola" value="Sim" /> : null}
              {hasReforco && ficha.cor_reforco ? <PrintField icon={Palette} label="Cor do Reforço" value={ficha.cor_reforco} /> : null}
              {isPolo && ficha.cor_peitilho_interno ? <PrintField icon={Palette} label="Cor Peitilho Interno" value={ficha.cor_peitilho_interno} /> : null}
              {isPolo && ficha.cor_peitilho_externo ? <PrintField icon={Palette} label="Cor Peitilho Externo" value={ficha.cor_peitilho_externo} /> : null}
              {(isPolo || isSocial) && ficha.cor_botao ? <PrintField icon={Circle} label="Cor do Botão" value={ficha.cor_botao} /> : null}
              {isSocial && ficha.cor_pe_de_gola_interno ? <PrintField icon={Palette} label="Cor Pé de Gola Interno" value={ficha.cor_pe_de_gola_interno} /> : null}
              {isSocial && ficha.cor_pe_de_gola_externo ? <PrintField icon={Palette} label="Cor Pé de Gola Externo" value={ficha.cor_pe_de_gola_externo} /> : null}
              {hasAbertura ? <PrintField icon={ArrowLeftRight} label="Abertura Lateral" value="Sim" /> : null}
              {hasAbertura && ficha.cor_abertura_lateral ? <PrintField icon={Palette} label="Cor Abertura Lateral" value={ficha.cor_abertura_lateral} /> : null}

              <PrintSeparator />

              <PrintField icon={Shield} label="Bolso" value={ficha.bolso} />
              <PrintField icon={Spline} label="Filete" value={yesNo(hasFilete)} />
              {hasFilete && ficha.filete_local ? <PrintField icon={MapPin} label="Local Filete" value={ficha.filete_local} /> : null}
              {hasFilete && ficha.filete_cor ? <PrintField icon={Palette} label="Cor Filete" value={ficha.filete_cor} /> : null}
              <PrintField icon={GripHorizontal} label="Faixa Refletiva" value={yesNo(hasFaixa)} />
              {hasFaixa && ficha.faixa_local ? <PrintField icon={MapPin} label="Local Faixa" value={ficha.faixa_local} /> : null}
              {hasFaixa && ficha.faixa_cor ? <PrintField icon={Palette} label="Cor Faixa" value={ficha.faixa_cor} /> : null}

              <PrintSeparator />

              <PrintField icon={Paintbrush} label="Personalização" value={normalizePrintPersonalizacao(ficha.arte)} />
              <PrintField icon={List} label="Nome/Nº" value={formatComNomes(ficha.com_nomes)} />
              <PrintField icon={Tag} label="Composição" value={ficha.composicao} />
            </div>
          </section>
        </div>

        <section className="print-card">
          <h2>
            <FileText aria-hidden="true" size={16} /> Observações
          </h2>
          <div
            id="print-observacoes"
            className="print-observacoes"
            dangerouslySetInnerHTML={{ __html: sanitizeObservationHtml(ficha.observacoes_html || ficha.observacoes || "Nenhuma") }}
          />
        </section>

        {ficha.imagens.length > 0 ? (
          <section className="print-card" id="print-imagesSection">
            <h2>
              <ImageIcon aria-hidden="true" size={16} /> Layout / Mockup do Produto
            </h2>
            <div id="print-imagesContainer" className={imageClassNames}>
              {ficha.imagens.slice(0, MAX_PRINT_IMAGES).map((image, index) => (
                <div className={ficha.imagens.length === 1 ? "print-image-item single" : "print-image-item"} key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt_text || `Imagem ${index + 1}`} />
                  {image.alt_text ? <div className="print-image-description">{image.alt_text}</div> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function PrintField({
  danger = false,
  forceShow = false,
  icon: Icon,
  label,
  muted = false,
  strong = false,
  value,
}: {
  danger?: boolean;
  forceShow?: boolean;
  icon?: LucideIcon;
  label: string;
  muted?: boolean;
  strong?: boolean;
  value: boolean | number | string | null | undefined;
}) {
  const formattedValue = formatValue(value);
  const lowerValue = String(formattedValue).trim().toLowerCase();

  if (!forceShow && (!lowerValue || lowerValue === "-" || lowerValue === "não" || lowerValue === "nao" || lowerValue === "nenhum" || lowerValue === "sem bolso")) {
    return null;
  }

  let valueClass = undefined;
  if (danger) valueClass = "print-value-danger";
  else if (strong) valueClass = "print-value-strong";
  else if (muted) valueClass = "print-value-muted";

  return (
    <div>
      <span className="label">
        {Icon ? <Icon aria-hidden="true" size={14} style={{ display: "inline-block", marginRight: "4px", verticalAlign: "-2px" }} /> : null}
        {label}:
      </span>{" "}
      <span className={valueClass}>{formattedValue}</span>
    </div>
  );
}

function PrintSeparator() {
  return <div className="print-group-separator" aria-hidden="true" />;
}

function normalizePrintPersonalizacao(value: string | null) {
  if (value === "sublimacao_serigrafia") return "Sublimação e Serigrafia";
  if (value === "serigrafia_dtf") return "Serigrafia e DTF";
  if (value === "serigrafia_bordado") return "Serigrafia e Bordado";
  return normalizePersonalizacaoLabel(value);
}

function buildProductRows(ficha: FichaDetail): PrintProductRow[] {
  const rawRows = ficha.itens
    .map((item) => ({
      detalhes: capitalizeFirst(String(item.detalhes_produto ?? item.detalhes ?? "").trim()),
      produto: capitalizeFirst(String(item.produto ?? item.descricao ?? "").trim()),
      quantidade: Number.isFinite(item.quantidade) ? item.quantidade : 0,
      rawColorReference: String(item.detalhes_produto || item.detalhes || item.produto || item.descricao || "").trim(),
      tamanho: String(item.tamanho ?? "").trim(),
    }))
    .filter((item) => item.tamanho || item.quantidade || item.produto || item.detalhes);

  const uniqueProducts = new Set(rawRows.map((item) => normalizeKey(item.produto)).filter(Boolean));
  const uniqueDetails = new Set(rawRows.map((item) => normalizeKey(item.detalhes)).filter(Boolean));
  const shouldApplyColors = uniqueProducts.size > 1 || uniqueDetails.size > 1;
  const useDetailsColor = shouldApplyColors && uniqueDetails.size > 1;

  const colorMap = new Map<string, string>();
  let fallbackCounter = 0;

  return rawRows.map((item) => {
    let colorClass = "";
    if (shouldApplyColors) {
      const reference = useDetailsColor ? item.rawColorReference : item.produto;
      const key = normalizeKey(reference);

      if (key && colorMap.has(key)) {
        colorClass = colorMap.get(key)!;
      } else {
        const result = getProductColorClass(reference, fallbackCounter);
        colorClass = result.className;
        if (result.isFallback) fallbackCounter++;
        if (key) colorMap.set(key, colorClass);
      }
    }

    return {
      ...item,
      colorClass,
    };
  });
}

function buildProductSummary(products: PrintProductRow[]) {
  const totals = new Map<string, { colorClass: string; name: string; quantity: number }>();
  const uniqueDetails = new Set(products.map((item) => normalizeKey(item.detalhes)).filter(Boolean));

  for (const item of products) {
    const key = normalizeKey(item.produto);
    if (!key || item.quantidade <= 0) continue;
    const current = totals.get(key) ?? { colorClass: item.colorClass, name: item.produto, quantity: 0 };
    current.quantity += item.quantidade;
    totals.set(key, current);
  }

  const summary = Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity);

  return {
    text: summary.length > 1 ? summary.map((item) => `${item.name} (${item.quantity})`).join(" / ") : "",
    useDetailsColor: uniqueDetails.size > 1,
  };
}

function getProductColorClass(value: string, fallbackIndex: number) {
  const normalized = normalizeKey(value);
  const catalog = [
    { className: "print-product-color--black", keys: ["preto", "preta", "pret"] },
    { className: "print-product-color--white", keys: ["branco", "branca", "white", "branc"] },
    { className: "print-product-color--royal", keys: ["azul royal", "royal", "azul"] },
    { className: "print-product-color--navy", keys: ["azul marinho", "marinho"] },
    { className: "print-product-color--turquoise", keys: ["azul turquesa", "turquesa"] },
    { className: "print-product-color--sky", keys: ["azul celeste", "celeste"] },
    { className: "print-product-color--petroleum", keys: ["azul petroleo", "petroleo"] },
    { className: "print-product-color--gray-melange", keys: ["cinza mescla", "mescla cinza"] },
    { className: "print-product-color--charcoal", keys: ["cinza chumbo", "chumbo"] },
    { className: "print-product-color--gray", keys: ["cinza medio", "cinza", "grafite"] },
    { className: "print-product-color--green", keys: ["verde bandeira", "verde"] },
    { className: "print-product-color--moss", keys: ["verde musgo", "musgo"] },
    { className: "print-product-color--lime", keys: ["verde limao", "limao"] },
    { className: "print-product-color--jade", keys: ["verde jade", "jade"] },
    { className: "print-product-color--light-green", keys: ["verde claro"] },
    { className: "print-product-color--canary", keys: ["amarelo canario", "amarela canario", "canario"] },
    { className: "print-product-color--yellow", keys: ["amarelo ouro", "amarela ouro", "amarelo", "amarel", "ouro", "dourado", "dourada", "dourad"] },
    { className: "print-product-color--pink", keys: ["rosa pink", "pink", "rosa"] },
    { className: "print-product-color--baby-pink", keys: ["rosa bebe", "bebe"] },
    { className: "print-product-color--purple", keys: ["roxo", "roxa"] },
    { className: "print-product-color--lilac", keys: ["lilas"] },
    { className: "print-product-color--red", keys: ["vermelho", "vermelha", "vermelh"] },
    { className: "print-product-color--burgundy", keys: ["bordo"] },
    { className: "print-product-color--marsala", keys: ["marsala"] },
    { className: "print-product-color--beige", keys: ["bege", "off-white", "off white", "offwhite"] },
    { className: "print-product-color--khaki", keys: ["caqui", "khaki"] },
    { className: "print-product-color--royal-melange", keys: ["royal mescla", "mescla royal"] },
    { className: "print-product-color--navy-melange", keys: ["marinho mescla", "mescla marinho"] },
    { className: "print-product-color--charcoal-melange", keys: ["chumbo mescla", "mescla chumbo"] },
    { className: "print-product-color--jeans", keys: ["jeans"] },
    { className: "print-product-color--ultramarine", keys: ["ultramarine", "ultramarino"] },
    { className: "print-product-color--cobalt", keys: ["cobalto"] },
    { className: "print-product-color--salmon", keys: ["salmao"] },
  ];
  const fallback = [
    "print-product-color--fallback-1",
    "print-product-color--fallback-2",
    "print-product-color--fallback-3",
    "print-product-color--fallback-4",
    "print-product-color--fallback-5",
    "print-product-color--fallback-6",
  ];

  const match = catalog.reduce<{ className: string; keyLength: number } | null>((best, item) => {
    const key = item.keys.find((candidate) => normalized.includes(normalizeKey(candidate)));
    if (!key) return best;
    const keyLength = normalizeKey(key).length;
    if (!best || keyLength > best.keyLength) return { className: item.className, keyLength };
    return best;
  }, null);

  if (match) {
    return { className: match.className, isFallback: false };
  }
  return { className: fallback[fallbackIndex % fallback.length], isFallback: true };
}

function getImagesClassNames(count: number) {
  return [
    "print-images-container",
    count === 1 ? "images-one" : "",
    count === 2 ? "images-two" : "",
    count === 3 ? "images-three" : "",
    count >= MAX_PRINT_IMAGES ? "compact-four" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function sanitizeObservationHtml(value: string) {
  const withoutScripts = value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  return withoutScripts
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\sjavascript:/gi, "");
}

function formatCliente(ficha: FichaDetail) {
  return [ficha.cliente_nome_snapshot, ficha.cliente_auxiliar].filter(Boolean).join(" - ");
}

function formatComNomes(value: number | null) {
  if (value === 1) return "Com nomes";
  if (value === 2) return "Com nomes e números";
  if (value === 3) return "Somente números";
  if (value === 0) return "Nenhum";
  return "-";
}

function yesNo(value: boolean) {
  return value ? "Sim" : "Não";
}

function formatValue(value: boolean | number | string | null | undefined) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDate(value: null | string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(value);
}

function hasAcabamentoMangaExtra(value: string | null) {
  const normalized = normalizeKey(value ?? "");
  return normalized.includes("punho") || normalized.includes("vies");
}

function isRegataProduct(value: string) {
  const normalized = normalizeKey(value);
  return normalized.includes("regata") || normalized.includes("colete");
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeFirst(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
