import type { CutPlanAlternative } from "./alternatives";
import { formatMarkerLabel } from "./calculator";
import type { CutPlanFabric, CutPlanInput, LayPlan } from "./model";

const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;
const productionLabel = (lay: LayPlan) => lay.frequencies.map((marker) => `${marker.size} ${marker.frequency * lay.layers}`).join(" · ");

export function CutPlanPrintSimple({ alternative, input }: { alternative: CutPlanAlternative; input: CutPlanInput }) {
  const totalLayers = alternative.result.fabrics.flatMap((fabric) => fabric.lays).reduce((total, lay) => total + lay.layers, 0);
  return <div className="cut-plan-print-simple">
    <section className="cut-plan-print-simple__page print-page">
      <header className="cut-plan-print-simple__header"><div><span>FICHA PROD · SETOR DE CORTE</span><h1>Plano de Corte</h1><p>Grades para conferência e montagem no Audaces</p></div><strong>{alternative.label}</strong></header>
      <dl className="cut-plan-print-simple__summary"><div><dt>Mesa</dt><dd>{input.tableLengthCm} cm</dd></div><div><dt>Máximo</dt><dd>{input.maxLayers} folhas</dd></div><div><dt>Enfestos</dt><dd>{alternative.layCount}</dd></div><div><dt>Folhas totais</dt><dd>{totalLayers}</dd></div></dl>
      {alternative.result.fabrics.map((fabricResult) => { const fabric = input.fabrics.find((item) => item.id === fabricResult.fabricId)!; return <section className="cut-plan-print-simple__fabric" key={fabric.id}>
        <header><div><h2>{fabricLabel(fabric)}</h2><p>{fabric.widthCm} cm · {fabric.type === "TUBULAR" ? "Tubular" : "Plano"}</p></div><strong>{fabricResult.lays.length} enfesto(s)</strong></header>
        <table><thead><tr><th>Enfesto</th><th>Folhas</th><th>Grade de produção</th><th>Produção</th></tr></thead><tbody>{fabricResult.lays.map((lay, index) => <tr key={lay.id}><td><strong>{fabricLabel(fabric)} — {String(index + 1).padStart(2, "0")}</strong></td><td><strong className="cut-plan-print-simple__layers">{lay.layers}</strong></td><td><strong>{formatMarkerLabel(lay.frequencies)}</strong></td><td>{productionLabel(lay)}</td></tr>)}</tbody></table>
        <h3>Conferência final</h3>
        <table className="cut-plan-print-simple__check"><thead><tr><th>Tamanho</th><th>Solicitado</th><th>Produzido</th><th>Saldo</th></tr></thead><tbody>{fabricResult.sizes.map((size) => <tr key={size.size}><td><strong>{size.size}</strong></td><td>{size.requested}</td><td>{size.produced}</td><td>{size.difference > 0 ? "+" : ""}{size.difference}</td></tr>)}</tbody></table>
      </section>; })}
      <footer>Valide fisicamente cada grade no Audaces antes de liberar o corte.</footer>
    </section>
  </div>;
}
