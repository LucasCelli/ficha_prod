import type { ReactNode } from "react";
import type { CutPlanAlternative } from "./alternatives";
import { countLabel, formatCutPlanSizeLabel, formatOperationalMarkerLabel } from "./calculator";
import { formatEstimatedLengthMeters } from "./dimensions";
import { compareUniformSizes } from "../../lib/uniform-sizes";
import { cutPlanDemandKey, parseCutPlanDemandKey, type CutPlanFabric, type CutPlanInput, type CutPlanSourceFicha, type FabricCutPlanResult, type LayPlan, type MergedLayPlan } from "./model";

const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;
const fichaDetail = (ficha: CutPlanSourceFicha) => [
  ficha.material,
  ficha.color,
  `Manga ${ficha.sleeveType === "LONGA" ? "longa" : "curta"}`,
  `${ficha.total} peças`,
].filter(Boolean).join(" · ");

// Ate 4 tabelas pequenas (menos de 15 linhas) cabem numa folha A4 vertical;
// tabelas maiores ganham folha propria para nao espremer o resto do plano.
const MAX_SMALL_TABLES_PER_PAGE = 4;
const LARGE_TABLE_ROW_THRESHOLD = 15;

interface PrintBlock {
  key: string;
  node: ReactNode;
  tableCount: number;
  hasLargeTable: boolean;
}

function paginateBlocks(blocks: PrintBlock[]) {
  let runningCount = 0;
  let forceBreakNext = false;
  return blocks.map((block) => {
    let breakBefore = false;
    if (block.tableCount > 0) {
      if (forceBreakNext) {
        breakBefore = true;
        runningCount = 0;
      } else if (runningCount > 0 && (block.hasLargeTable || runningCount + block.tableCount > MAX_SMALL_TABLES_PER_PAGE)) {
        breakBefore = true;
        runningCount = 0;
      }
      runningCount += block.tableCount;
      forceBreakNext = block.hasLargeTable;
    }
    return { ...block, breakBefore };
  });
}

function PagedBlock({ breakBefore, children }: { breakBefore: boolean; children: ReactNode }) {
  return <div className={breakBefore ? "cut-plan-print-simple__break" : undefined}>{children}</div>;
}

function LayCard({ badgeLayers, header, rows }: { badgeLayers: number; header: ReactNode; rows: ReactNode }) {
  return <article className="cut-plan-print-simple__lay">
    <header>
      <div>{header}</div>
      <strong className="cut-plan-print-simple__badge"><span>{badgeLayers}</span><small>{badgeLayers === 1 ? "folha" : "folhas"}</small></strong>
    </header>
    <table>{rows}</table>
  </article>;
}

function mergedLayRowCount(lay: MergedLayPlan) {
  return lay.allocations.reduce((sum, allocation) => sum + allocation.frequencies.length, 0);
}

function MergedLayCard({ fabricResults, fabrics, index, lay }: { fabricResults: FabricCutPlanResult[]; fabrics: CutPlanFabric[]; index: number; lay: MergedLayPlan }) {
  return <LayCard badgeLayers={lay.layers} header={<>
    <h3>Enfesto {String(index + 1).padStart(2, "0")}</h3>
    {lay.allocations.map((allocation) => {
      const fabric = fabrics.find((item) => item.id === allocation.fabricId)!;
      const fabricResult = fabricResults.find((item) => item.fabricId === allocation.fabricId)!;
      const showSleeveType = new Set(fabricResult.sizes.map((size) => size.sleeveType)).size > 1;
      return <p key={allocation.id}><strong>{fabricLabel(fabric)}</strong> {formatOperationalMarkerLabel(allocation.frequencies, showSleeveType)}</p>;
    })}
    {lay.markerLengthCm ? <p className="cut-plan-print-simple__length">Comprimento estimado: {formatEstimatedLengthMeters(lay.markerLengthCm)}</p> : null}
  </>} rows={<>
    <thead><tr><th>Tecido</th><th>Tamanho</th><th>Manga</th><th>Frequência</th><th>Peças cortadas</th></tr></thead>
    <tbody>{lay.allocations.flatMap((allocation) => {
      const fabric = fabrics.find((item) => item.id === allocation.fabricId)!;
      return allocation.frequencies.map((marker) => <tr key={`${allocation.id}-${marker.size}-${marker.sleeveType}`}><td>{fabricLabel(fabric)}</td><td>{formatCutPlanSizeLabel(marker.size)}</td><td>{marker.sleeveType === "LONGA" ? "Longa" : "Curta"}</td><td>{marker.frequency}</td><td>{marker.frequency * lay.layers}</td></tr>);
    })}</tbody>
  </>} />;
}

function FabricLayCard({ index, lay, showSleeveType }: { index: number; lay: LayPlan; showSleeveType: boolean }) {
  return <LayCard badgeLayers={lay.layers} header={<>
    <h3>Enfesto {String(index + 1).padStart(2, "0")}</h3>
    <p><strong>{formatOperationalMarkerLabel(lay.frequencies, showSleeveType)}</strong></p>
    {lay.markerLengthCm ? <p className="cut-plan-print-simple__length">Comprimento estimado: {formatEstimatedLengthMeters(lay.markerLengthCm)}</p> : null}
  </>} rows={<>
    <thead><tr><th>Tamanho</th><th>Manga</th><th>Frequência</th><th>Peças cortadas</th></tr></thead>
    <tbody>{lay.frequencies.map((marker) => <tr key={`${marker.size}-${marker.sleeveType}`}><td>{formatCutPlanSizeLabel(marker.size)}</td><td>{marker.sleeveType === "LONGA" ? "Longa" : "Curta"}</td><td>{marker.frequency}</td><td>{marker.frequency * lay.layers}</td></tr>)}</tbody>
  </>} />;
}

function pairUp<T>(items: T[]) {
  const pairs: T[][] = [];
  for (let index = 0; index < items.length; index += 2) pairs.push(items.slice(index, index + 2));
  return pairs;
}

function aggregateOverallSizes(fabricResults: FabricCutPlanResult[]) {
  const totals = new Map<string, { produced: number; requested: number }>();
  for (const fabricResult of fabricResults) {
    for (const size of fabricResult.sizes) {
      const key = cutPlanDemandKey(size.size, size.sleeveType);
      const current = totals.get(key) ?? { produced: 0, requested: 0 };
      current.produced += size.produced;
      current.requested += size.requested;
      totals.set(key, current);
    }
  }
  return [...totals.entries()]
    .map(([key, value]) => {
      const { size, sleeveType } = parseCutPlanDemandKey(key);
      return { difference: value.produced - value.requested, produced: value.produced, requested: value.requested, size, sleeveType };
    })
    .sort((left, right) => compareUniformSizes(left.size, right.size) || left.sleeveType.localeCompare(right.sleeveType));
}

function OverallConference({ rows }: { rows: ReturnType<typeof aggregateOverallSizes> }) {
  const totals = rows.reduce((sum, row) => ({
    difference: sum.difference + Math.max(0, row.difference),
    produced: sum.produced + row.produced,
    requested: sum.requested + row.requested,
  }), { difference: 0, produced: 0, requested: 0 });
  return <section className="cut-plan-print-simple__conference"><h3>Conferência final</h3><table className="cut-plan-print-simple__check"><thead><tr><th>Tamanho</th><th>Manga</th><th>Pedido</th><th>Vai cortar</th><th>Diferença</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.size}-${row.sleeveType}`}><td><strong>{formatCutPlanSizeLabel(row.size)}</strong></td><td>{row.sleeveType === "LONGA" ? "Longa" : "Curta"}</td><td>{row.requested}</td><td>{row.produced}</td><td>{row.difference > 0 ? "+" : ""}{row.difference}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Totais</th><td><strong>{totals.requested}</strong></td><td><strong>{totals.produced}</strong></td><td><strong>{totals.difference}</strong></td></tr></tfoot></table></section>;
}

export function CutPlanPrintSimple({ alternative, input, sourceFichas = [] }: { alternative: CutPlanAlternative; input: CutPlanInput; sourceFichas?: CutPlanSourceFicha[] }) {
  const blocks: PrintBlock[] = [];
  // Uma unica tabela no plano inteiro pode ocupar a largura toda; a partir de
  // duas, todas ficam do mesmo tamanho para nao destacar a ultima sozinha na linha.
  const totalLays = alternative.result.mergedLays?.length ?? alternative.result.fabrics.reduce((sum, fabricResult) => sum + fabricResult.lays.length, 0);
  const isSolo = totalLays === 1;
  const rowClassName = isSolo ? "cut-plan-print-simple__lay-row is-solo" : "cut-plan-print-simple__lay-row";

  if (alternative.result.mergedLays) {
    const mergedLays = alternative.result.mergedLays;
    blocks.push({ key: "merged-header", node: <header className="cut-plan-print-simple__fabric-header"><div><h2>Enfestos mesclados</h2><p>As grades permanecem separadas por cor.</p></div><strong>{countLabel(mergedLays.length, "enfesto")}</strong></header>, tableCount: 0, hasLargeTable: false });
    pairUp(mergedLays).forEach((pair, rowIndex) => {
      const baseIndex = rowIndex * 2;
      blocks.push({
        key: `merged-row-${rowIndex}`,
        node: <div className={rowClassName}>{pair.map((lay, offset) => <MergedLayCard fabricResults={alternative.result.fabrics} fabrics={input.fabrics} index={baseIndex + offset} key={lay.id} lay={lay} />)}</div>,
        tableCount: pair.length,
        hasLargeTable: pair.some((lay) => mergedLayRowCount(lay) >= LARGE_TABLE_ROW_THRESHOLD),
      });
    });
  } else {
    alternative.result.fabrics.forEach((fabricResult) => {
      const fabric = input.fabrics.find((item) => item.id === fabricResult.fabricId)!;
      const showSleeveType = new Set(fabricResult.sizes.map((size) => size.sleeveType)).size > 1;
      blocks.push({ key: `fabric-header-${fabric.id}`, node: <header className="cut-plan-print-simple__fabric-header"><div><h2>{fabricLabel(fabric)}</h2><p>{fabric.widthCm} cm · {fabric.type === "TUBULAR" ? "Tubular" : "Plano"}</p></div><strong>{countLabel(fabricResult.lays.length, "enfesto")}</strong></header>, tableCount: 0, hasLargeTable: false });
      pairUp(fabricResult.lays).forEach((pair, rowIndex) => {
        const baseIndex = rowIndex * 2;
        blocks.push({
          key: `fabric-${fabric.id}-row-${rowIndex}`,
          node: <div className={rowClassName}>{pair.map((lay, offset) => <FabricLayCard index={baseIndex + offset} key={lay.id} lay={lay} showSleeveType={showSleeveType} />)}</div>,
          tableCount: pair.length,
          hasLargeTable: pair.some((lay) => lay.frequencies.length >= LARGE_TABLE_ROW_THRESHOLD),
        });
      });
    });
  }

  const overallSizes = aggregateOverallSizes(alternative.result.fabrics);
  blocks.push({
    key: "overall-conference",
    node: <OverallConference rows={overallSizes} />,
    tableCount: 1,
    hasLargeTable: overallSizes.length >= LARGE_TABLE_ROW_THRESHOLD,
  });

  const pagedBlocks = paginateBlocks(blocks);

  return <div className="cut-plan-print-simple">
    <section className="cut-plan-print-simple__page print-page">
      <header className="cut-plan-print-simple__header"><h1>Plano de Corte</h1></header>
      {sourceFichas.length ? <section className="cut-plan-print-simple__sources"><h2>Fichas anexadas</h2><div>{sourceFichas.map((ficha) => <article key={ficha.id}>{ficha.imageUrl ? <>
        {/* Imagem remota já carregada pela ficha; no documento de impressão precisamos preservar a URL original. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={ficha.imageUrl} />
      </> : <span aria-hidden="true" className="cut-plan-print-simple__source-placeholder" />}<p><strong>{ficha.client}</strong><small>{fichaDetail(ficha)}</small></p></article>)}</div></section> : null}
      {pagedBlocks.map((block) => <PagedBlock breakBefore={block.breakBefore} key={block.key}>{block.node}</PagedBlock>)}
    </section>
  </div>;
}
