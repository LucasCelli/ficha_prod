import type { CutPlanAlternative } from "./alternatives";
import { countLabel, formatCutPlanSizeLabel, formatMarkerLabel } from "./calculator";
import { formatEstimatedLengthMeters } from "./dimensions";
import type { CutPlanFabric, CutPlanInput, CutPlanSourceFicha, FabricCutPlanResult } from "./model";

const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;
const fichaDetail = (ficha: CutPlanSourceFicha) => [
  ficha.material,
  ficha.color,
  `Manga ${ficha.sleeveType === "LONGA" ? "longa" : "curta"}`,
  `${ficha.total} peças`,
].filter(Boolean).join(" · ");

function Conference({ fabricResult, fabric }: { fabricResult: FabricCutPlanResult; fabric: CutPlanFabric }) {
  return <section className="cut-plan-print-simple__conference"><h3>Conferência final — {fabricLabel(fabric)}</h3><table className="cut-plan-print-simple__check"><thead><tr><th>Tamanho</th><th>Manga</th><th>Pedido</th><th>Vai cortar</th><th>Diferença</th></tr></thead><tbody>{fabricResult.sizes.map((size) => <tr key={`${size.size}-${size.sleeveType}`}><td><strong>{formatCutPlanSizeLabel(size.size)}</strong></td><td>{size.sleeveType === "LONGA" ? "Longa" : "Curta"}</td><td>{size.requested}</td><td>{size.produced}</td><td>{size.difference > 0 ? "+" : ""}{size.difference}</td></tr>)}</tbody></table></section>;
}

export function CutPlanPrintSimple({ alternative, input, sourceFichas = [] }: { alternative: CutPlanAlternative; input: CutPlanInput; sourceFichas?: CutPlanSourceFicha[] }) {
  return <div className="cut-plan-print-simple">
    <section className="cut-plan-print-simple__page print-page">
      <header className="cut-plan-print-simple__header"><h1>Plano de Corte</h1></header>
      {sourceFichas.length ? <section className="cut-plan-print-simple__sources"><h2>Fichas anexadas</h2><div>{sourceFichas.map((ficha) => <article key={ficha.id}>{ficha.imageUrl ? <>
        {/* Imagem remota já carregada pela ficha; no documento de impressão precisamos preservar a URL original. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={ficha.imageUrl} />
      </> : <span aria-hidden="true" className="cut-plan-print-simple__source-placeholder" />}<p><strong>{ficha.client}</strong><small>{fichaDetail(ficha)}</small></p></article>)}</div></section> : null}
      {alternative.result.mergedLays ? <section className="cut-plan-print-simple__fabric"><header><div><h2>Enfestos mesclados</h2><p>Grades separadas por cor</p></div><strong>{countLabel(alternative.result.mergedLays.length, "enfesto")}</strong></header><table><thead><tr><th>Enfesto</th><th>Folhas</th><th>Tecido</th><th>Grade</th><th>Compr. estimado</th></tr></thead><tbody>{alternative.result.mergedLays.flatMap((lay, index) => lay.allocations.map((allocation, allocationIndex) => { const fabric = input.fabrics.find((item) => item.id === allocation.fabricId)!; const fabricResult = alternative.result.fabrics.find((item) => item.fabricId === allocation.fabricId)!; const showSleeveType = new Set(fabricResult.sizes.map((size) => size.sleeveType)).size > 1; return <tr key={allocation.id}><td>{allocationIndex === 0 ? <strong>Enfesto {String(index + 1).padStart(2, "0")}</strong> : null}</td><td>{allocationIndex === 0 ? <strong className="cut-plan-print-simple__layers">{lay.layers}</strong> : null}</td><td><strong>{fabricLabel(fabric)}</strong></td><td><strong>{formatMarkerLabel(allocation.frequencies, showSleeveType)}</strong></td><td>{allocation.markerLengthCm ? formatEstimatedLengthMeters(allocation.markerLengthCm) : "Sem medidas"}</td></tr>; }))}</tbody></table></section> : alternative.result.fabrics.map((fabricResult) => { const fabric = input.fabrics.find((item) => item.id === fabricResult.fabricId)!; const showSleeveType = new Set(fabricResult.sizes.map((size) => size.sleeveType)).size > 1; return <section className="cut-plan-print-simple__fabric" key={fabric.id}><header><div><h2>{fabricLabel(fabric)}</h2><p>{fabric.widthCm} cm · {fabric.type === "TUBULAR" ? "Tubular" : "Plano"}</p></div><strong>{countLabel(fabricResult.lays.length, "enfesto")}</strong></header><table><thead><tr><th>Enfesto</th><th>Folhas</th><th>Grade</th><th>Compr. estimado</th></tr></thead><tbody>{fabricResult.lays.map((lay, index) => <tr key={lay.id}><td><strong>Enfesto {String(index + 1).padStart(2, "0")}</strong></td><td><strong className="cut-plan-print-simple__layers">{lay.layers}</strong></td><td><strong>{formatMarkerLabel(lay.frequencies, showSleeveType)}</strong></td><td>{lay.markerLengthCm ? formatEstimatedLengthMeters(lay.markerLengthCm) : "Sem medidas"}</td></tr>)}</tbody></table></section>; })}
      {alternative.result.fabrics.map((fabricResult) => <Conference fabric={input.fabrics.find((item) => item.id === fabricResult.fabricId)!} fabricResult={fabricResult} key={fabricResult.fabricId} />)}
    </section>
  </div>;
}
