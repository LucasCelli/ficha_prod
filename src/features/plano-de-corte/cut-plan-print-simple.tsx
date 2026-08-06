import type { CutPlanAlternative } from "./alternatives";
import { countLabel, formatMarkerLabel } from "./calculator";
import type { CutPlanFabric, CutPlanInput, LayPlan } from "./model";

const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;
const productionLabel = (lay: LayPlan) => lay.frequencies.map((marker) => `${marker.size} ${marker.frequency * lay.layers}`).join(" · ");

export function CutPlanPrintSimple({ alternative, input }: { alternative: CutPlanAlternative; input: CutPlanInput }) {
  const totalLayers = alternative.result.fabrics.flatMap((fabric) => fabric.lays).reduce((total, lay) => total + lay.layers, 0);
  return <div className="cut-plan-print-simple">
    <section className="cut-plan-print-simple__page print-page">
      <header className="cut-plan-print-simple__header"><div><span>FICHA PROD · SETOR DE CORTE</span><h1>Plano de Corte</h1><p>Grades para conferir e montar no Audaces</p></div><strong>{alternative.label}</strong></header>
      <dl className="cut-plan-print-simple__summary"><div><dt>Mesa</dt><dd>{input.tableLengthCm} cm</dd></div><div><dt>Máx. por enfesto</dt><dd>{input.maxLayers} folhas</dd></div><div><dt>Enfestos</dt><dd>{alternative.layCount}</dd></div><div><dt>Total de folhas</dt><dd>{totalLayers}</dd></div></dl>
      {alternative.result.fabrics.map((fabricResult) => { const fabric = input.fabrics.find((item) => item.id === fabricResult.fabricId)!; return <section className="cut-plan-print-simple__fabric" key={fabric.id}>
        <header><div><h2>{fabricLabel(fabric)}</h2><p>{fabric.widthCm} cm · {fabric.type === "TUBULAR" ? "Tubular" : "Plano"}</p></div><strong>{countLabel(fabricResult.lays.length, "enfesto")}</strong></header>
        <table><thead><tr><th>Enfesto</th><th>Folhas</th><th>Grade</th><th>Compr. estimado</th><th>Peças cortadas</th></tr></thead><tbody>{fabricResult.lays.map((lay, index) => <tr key={lay.id}><td><strong>{fabricLabel(fabric)} — {String(index + 1).padStart(2, "0")}</strong></td><td><strong className="cut-plan-print-simple__layers">{lay.layers}</strong></td><td><strong>{formatMarkerLabel(lay.frequencies)}</strong></td><td>{lay.markerLengthCm ? `${lay.markerLengthCm} cm` : "Sem medidas"}</td><td>{productionLabel(lay)}</td></tr>)}</tbody></table>
        <h3>Conferência final</h3>
        <table className="cut-plan-print-simple__check"><thead><tr><th>Tamanho</th><th>Pedido</th><th>Vai cortar</th><th>Diferença</th></tr></thead><tbody>{fabricResult.sizes.map((size) => <tr key={size.size}><td><strong>{size.size}</strong></td><td>{size.requested}</td><td>{size.produced}</td><td>{size.difference > 0 ? "+" : ""}{size.difference}</td></tr>)}</tbody></table>
      </section>; })}
      <footer>Confira cada grade no Audaces antes de liberar o corte.</footer>
    </section>
  </div>;
}
