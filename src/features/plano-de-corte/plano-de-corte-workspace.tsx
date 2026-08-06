"use client";

import { useCallback, useMemo, useState } from "react";
import { Calculator, Plus, Printer, RotateCcw, Ruler, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, Badge, Button, EmptyState, IconButton } from "@/components/ui";
import { calculateCutPlanAlternatives, type CutPlanAlternative } from "./alternatives";
import { countLabel, CutPlanCalculationError } from "./calculator";
import { CutPlanFichaPicker } from "./cut-plan-ficha-picker";
import { CutPlanNativePrintLayer } from "./cut-plan-native-print-layer";
import { CutPlanItemsEditor, sortCutPlanItems } from "./cut-plan-items-editor";
import type { CutPlanFabric, CutPlanInput, CutPlanItem, CutPlanSourceFicha, FabricType } from "./model";
import { validateCutPlan } from "./validation";
import { getLayerLimit } from "./dimensions";
import { CutPlanSizeProfilesModal } from "./cut-plan-size-profiles-modal";

const FABRICS = ["Malha PV", "Malha Fria", "Dry Fit", "Helanca", "Brim", "Oxford", "Piquet", "Meia Malha", "Moletom", "Suplex", "Microfibra", "Tactel", "Outro"];
const createId = () => crypto.randomUUID();
const createFabric = (base?: CutPlanFabric): CutPlanFabric => ({ id: createId(), name: "Malha PV", color: "", widthCm: base?.widthCm ?? 118, type: base?.type ?? "TUBULAR" });
const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;

const normalizeMaterial = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().trim();

export function PlanoDeCorteWorkspace() {
  const [tableLengthCm, setTableLengthCm] = useState(800);
  const [maxLayers, setMaxLayers] = useState(50);
  const [fabrics, setFabrics] = useState<CutPlanFabric[]>(() => [createFabric()]);
  const [items, setItems] = useState<CutPlanItem[]>([]);
  const [sourceFichas, setSourceFichas] = useState<CutPlanSourceFicha[]>([]);
  const [alternatives, setAlternatives] = useState<CutPlanAlternative[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [printSelection, setPrintSelection] = useState<CutPlanAlternative[] | null>(null);
  const [sizeProfiles, setSizeProfiles] = useState<CutPlanInput["sizeProfiles"]>([]);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const input = useMemo<CutPlanInput>(() => ({ tableLengthCm, maxLayers, fabrics, items, sizeProfiles, sourceFichaIds: sourceFichas.map((ficha) => ficha.id) }), [tableLengthCm, maxLayers, fabrics, items, sizeProfiles, sourceFichas]);
  const selected = alternatives.find((alternative) => alternative.id === selectedId) ?? alternatives[0];
  const invalidate = () => { setAlternatives([]); setSelectedId(""); };

  function updateFabric(fabricId: string, patch: Partial<CutPlanFabric>) {
    const sharedPatch = { ...(patch.widthCm !== undefined ? { widthCm: patch.widthCm } : {}), ...(patch.type ? { type: patch.type } : {}) };
    setFabrics((current) => current.map((fabric) => fabric.id === fabricId ? { ...fabric, ...patch } : { ...fabric, ...sharedPatch }));
    if (patch.type) setMaxLayers((current) => Math.min(current, getLayerLimit(patch.type!)));
    invalidate();
  }
  function addFabric() { setFabrics((current) => [...current, createFabric(current[0])]); invalidate(); }
  function removeFabric(fabricId: string) {
    if (items.some((item) => item.fabricId === fabricId)) return toast.error("Este tecido está em uso.", { description: "Troque o tecido dessas linhas antes de excluir." });
    setFabrics((current) => current.filter((fabric) => fabric.id !== fabricId)); invalidate();
  }
  function updateItem(itemId: string, patch: Partial<CutPlanItem>) { setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item)); invalidate(); }
  function addItem(afterId?: string) {
    if (!fabrics.length) return toast.error("Adicione um tecido antes.");
    const item = { id: createId(), fabricId: fabrics[0].id, size: "", quantity: 1 };
    setItems((current) => { if (!afterId) return [...current, item]; const index = current.findIndex((row) => row.id === afterId); return [...current.slice(0, index + 1), item, ...current.slice(index + 1)]; }); invalidate();
  }
  function duplicateItem(itemId: string, direction: "above" | "below") {
    setItems((current) => { const index = current.findIndex((item) => item.id === itemId); const copy = { ...current[index], id: createId() }; const target = direction === "above" ? index : index + 1; return [...current.slice(0, target), copy, ...current.slice(target)]; }); invalidate();
  }
  function moveItem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= items.length) return;
    setItems((current) => { const next = [...current]; const [moved] = next.splice(fromIndex, 1); next.splice(toIndex, 0, moved); return next; }); invalidate();
  }
  function sortItems() { setItems((current) => sortCutPlanItems(current)); invalidate(); toast.success("Tamanhos ordenados."); }
  function addSourceFicha(ficha: CutPlanSourceFicha, overwrite = false) {
    const existingSource = sourceFichas.find((current) => current.id === ficha.id);
    if (existingSource && !overwrite) return false;
    if (!ficha.material.trim()) { toast.error("Esta ficha está sem tecido."); return false; }
    if (!ficha.items.length) { toast.error("Esta ficha está sem tamanhos e quantidades."); return false; }
    const baseSources = overwrite ? sourceFichas.filter((current) => current.id !== ficha.id) : sourceFichas;
    const baseItems = overwrite ? items.filter((item) => item.sourceFichaId !== ficha.id) : items;
    const replacedFabricIds = new Set(items.filter((item) => item.sourceFichaId === ficha.id).map((item) => item.fabricId));
    const nextReferencedFabricIds = new Set(baseItems.map((item) => item.fabricId));
    let nextFabrics = overwrite
      ? fabrics.filter((fabric) => !replacedFabricIds.has(fabric.id) || nextReferencedFabricIds.has(fabric.id))
      : fabrics;
    const requiredMaterial = baseSources[0]?.material;
    if (requiredMaterial && normalizeMaterial(requiredMaterial) !== normalizeMaterial(ficha.material)) {
      toast.error("Esta ficha é de outro tecido.", { description: "O plano está usando " + requiredMaterial + "." });
      return false;
    }
    let targetFabric = nextFabrics.find((fabric) => normalizeMaterial(fabric.name) === normalizeMaterial(ficha.material) && normalizeMaterial(fabric.color) === normalizeMaterial(ficha.color));
    if (!targetFabric) {
      if (!existingSource && !baseItems.length && !baseSources.length && nextFabrics.length === 1) {
        targetFabric = { ...nextFabrics[0], name: ficha.material, color: ficha.color };
        nextFabrics = [targetFabric];
      } else {
        targetFabric = { ...createFabric(nextFabrics[0] ?? fabrics[0]), name: ficha.material, color: ficha.color };
        nextFabrics = [...nextFabrics, targetFabric];
      }
    }
    const importedItems = ficha.items.map((item) => ({ id: createId(), fabricId: targetFabric.id, size: item.size, quantity: item.quantity, sourceFichaId: ficha.id }));
    setFabrics(nextFabrics);
    setItems([...baseItems, ...importedItems]);
    setSourceFichas(existingSource ? sourceFichas.map((current) => current.id === ficha.id ? ficha : current) : [...sourceFichas, ficha]);
    invalidate();
    toast.success(existingSource ? "Ficha atualizada no plano." : "Ficha adicionada ao plano.");
    return true;
  }
  function removeSourceFicha(fichaId: string) {
    const remainingItems = items.filter((item) => item.sourceFichaId !== fichaId);
    const referencedFabricIds = new Set(remainingItems.map((item) => item.fabricId));
    const remainingFabrics = fabrics.filter((fabric) => referencedFabricIds.has(fabric.id));
    setItems(remainingItems);
    setFabrics(remainingFabrics.length ? remainingFabrics : [createFabric(fabrics[0])]);
    setSourceFichas((current) => current.filter((ficha) => ficha.id !== fichaId));
    invalidate();
    toast.success("Ficha removida do plano.");
  }
  function calculate() {
    const issues = validateCutPlan(input);
    if (issues.length) {
      toast.error("Revise os dados antes de calcular", { description: issues.join(" ") });
      return;
    }
    setCalculating(true);
    window.setTimeout(() => {
      try { const generated = calculateCutPlanAlternatives(input); setAlternatives(generated); setSelectedId(generated[0]?.id ?? ""); toast.success(generated.length === 1 ? "1 opção de plano encontrada." : `${generated.length} opções de plano encontradas.`); }
      catch (error) {
        setAlternatives([]);
        toast.error("Não deu para calcular o plano", { description: error instanceof CutPlanCalculationError ? error.message : "Tente de novo." });
      } finally {
        setCalculating(false);
      }
    }, 0);
  }
  function clear() { setTableLengthCm(800); setMaxLayers(50); setFabrics([createFabric()]); setItems([]); setSourceFichas([]); setSizeProfiles([]); setAlternatives([]); setConfirmClear(false); }
  const finishPrinting = useCallback(() => setPrintSelection(null), []);
  function printPlan(scope: "current" | "all") {
    if (!selected) return;
    setPrintSelection(scope === "all" ? alternatives : [selected]);
  }

  return <section className="cut-plan" aria-labelledby="cut-plan-title">
    <header className="cut-plan__header"><span aria-hidden="true"><Scissors size={24} /></span><div><h1 id="cut-plan-title">Plano de Corte</h1><p>Monte os enfestos antes de fazer o encaixe no Audaces.</p></div></header>
    <Panel number="1" title="Mesa e enfesto"><div className="cut-plan__settings"><NumberField id="cut-plan-table-length" label="Tamanho da mesa" unit="cm" value={tableLengthCm} onChange={(value) => { setTableLengthCm(value); invalidate(); }} /><NumberField key={fabrics[0]?.type ?? "TUBULAR"} id="cut-plan-max-layers" label="Máximo de folhas por enfesto" max={getLayerLimit(fabrics[0]?.type ?? "TUBULAR")} unit="folhas" integer value={maxLayers} onChange={(value) => { setMaxLayers(Math.min(value, getLayerLimit(fabrics[0]?.type ?? "TUBULAR"))); invalidate(); }} /></div></Panel>
    <Panel number="2" title="Tecidos" action={<Button variant="secondary" onClick={addFabric}><Plus size={17} /> Adicionar tecido</Button>}><div className="cut-plan__fabric-list">{fabrics.map((fabric, index) => <article className="cut-plan__fabric" key={fabric.id}><div className="cut-plan__fabric-title"><strong>Tecido {String(index + 1).padStart(2, "0")}</strong><IconButton label={`Remover ${fabricLabel(fabric)}`} onClick={() => removeFabric(fabric.id)} size="sm" tone="danger"><Trash2 size={17} /></IconButton></div><div className="cut-plan__fabric-fields"><Field id={`cut-plan-fabric-name-${fabric.id}`} label="Tecido"><select id={`cut-plan-fabric-name-${fabric.id}`} value={FABRICS.includes(fabric.name) ? fabric.name : "Outro"} onChange={(event) => updateFabric(fabric.id, { name: event.currentTarget.value })}>{FABRICS.map((name) => <option key={name}>{name}</option>)}</select>{fabric.name === "Outro" || !FABRICS.includes(fabric.name) ? <input aria-label="Nome do tecido" value={fabric.name === "Outro" ? "" : fabric.name} placeholder="Digite o nome do tecido" onChange={(event) => updateFabric(fabric.id, { name: event.currentTarget.value || "Outro" })} /> : null}</Field><Field id={`cut-plan-fabric-color-${fabric.id}`} label="Cor"><input id={`cut-plan-fabric-color-${fabric.id}`} value={fabric.color} placeholder="Ex.: Azul Marinho" onChange={(event) => updateFabric(fabric.id, { color: event.currentTarget.value })} /></Field><NumberField id={`cut-plan-fabric-width-${fabric.id}`} label="Largura" unit="cm" value={fabric.widthCm} onChange={(value) => updateFabric(fabric.id, { widthCm: value })} /><Field id={`cut-plan-fabric-type-${fabric.id}`} label="Plano ou tubular"><select id={`cut-plan-fabric-type-${fabric.id}`} value={fabric.type} onChange={(event) => updateFabric(fabric.id, { type: event.currentTarget.value as FabricType })}><option value="PLANO">Plano</option><option value="TUBULAR">Tubular</option></select></Field></div><small>{index ? "A largura e o tipo seguem o primeiro tecido." : fabric.type === "TUBULAR" ? "No tubular, a frequência de cada tamanho sai sempre em número par." : "A frequência de cada tamanho vai de 1 a 6."}</small></article>)}</div></Panel>
    <Panel number="3" title="Tamanhos e quantidades"><CutPlanFichaPicker added={sourceFichas} onAdd={addSourceFicha} onRemove={removeSourceFicha} /><CutPlanItemsEditor fabrics={fabrics} items={items} addItem={addItem} duplicateItem={duplicateItem} moveItem={moveItem} sortItems={sortItems} updateItem={updateItem} removeItem={(itemId) => { setItems((current) => current.filter((item) => item.id !== itemId)); invalidate(); }} /></Panel>
    <div className="form-actions"><Button variant="ghost" onClick={() => setConfirmClear(true)}><RotateCcw size={17} /> Limpar plano</Button><Button aria-busy={calculating} disabled={calculating} onClick={calculate}>{calculating ? <span className="button-spinner" aria-hidden="true" /> : <Calculator aria-hidden="true" size={18} />} {calculating ? "Calculando" : "Calcular plano"}</Button></div>
    <Panel number="4" title="Resultado">
      {!selected ? <EmptyState title="Nada calculado ainda" description="Preencha os tamanhos e as quantidades e clique em Calcular plano." /> : <><div className="cut-plan__result-toolbar"><div className="cut-plan__tabs" role="group" aria-label="Opções de plano">{alternatives.map((alternative) => <button aria-pressed={alternative.id === selected.id} className={alternative.id === selected.id ? "is-active" : ""} key={alternative.id} onClick={() => setSelectedId(alternative.id)} type="button"><span>{alternative.label}</span><small>{countLabel(alternative.layCount, "enfesto")}</small></button>)}</div><div className="cut-plan__print-actions"><Button onClick={() => printPlan("current")} variant="secondary"><Printer size={17} /> Imprimir esta</Button>{alternatives.length > 1 ? <Button onClick={() => printPlan("all")} variant="ghost"><Printer size={17} /> Imprimir todas</Button> : null}</div></div><p className="cut-plan__alternative-description">{selected.description}</p><PlanResult alternative={selected} fabrics={fabrics} input={input} /></>}
    </Panel>
    {printSelection ? <CutPlanNativePrintLayer alternatives={printSelection} input={input} onPrinted={finishPrinting} /> : null}
    <Button className="cut-plan__profiles-trigger" onClick={() => setProfilesOpen(true)} variant="secondary"><Ruler aria-hidden="true" size={18} /> Medidas{sizeProfiles.length ? ` (${sizeProfiles.length})` : ""}</Button>
    {profilesOpen ? <CutPlanSizeProfilesModal profiles={sizeProfiles} onClose={() => setProfilesOpen(false)} onSave={(profiles) => { setSizeProfiles(profiles); setProfilesOpen(false); invalidate(); toast.success("Medidas salvas para este plano."); }} /> : null}
    {confirmClear ? <AlertDialog title="Limpar plano" description="Os tecidos, os tamanhos, as quantidades e o resultado calculado serão apagados." onClose={() => setConfirmClear(false)}>
      <section className="confirm-dialog" aria-describedby="cut-plan-clear-description">
        <header className="confirm-dialog__header"><div><span className="confirm-dialog__eyebrow">Confirmação necessária</span><h2>Limpar este plano?</h2></div></header>
        <p id="cut-plan-clear-description">Os tecidos, os tamanhos, as quantidades e o resultado calculado serão apagados.</p>
        <div className="confirm-dialog__actions"><AlertDialogCancel asChild><Button variant="ghost">Cancelar</Button></AlertDialogCancel><AlertDialogAction asChild><Button variant="danger" onClick={clear}>Limpar plano</Button></AlertDialogAction></div>
      </section>
    </AlertDialog> : null}
  </section>;
}

function PlanResult({ alternative, fabrics, input }: { alternative: CutPlanAlternative; fabrics: CutPlanFabric[]; input: CutPlanInput }) {
  const lays = alternative.result.fabrics.flatMap((fabric) => fabric.lays); return <><dl className="cut-plan__summary"><Metric label="Tecidos" value={alternative.result.fabrics.length} /><Metric label="Enfestos" value={lays.length} /><Metric label="Total de folhas" value={lays.reduce((sum, lay) => sum + lay.layers, 0)} /><Metric label="Peças a mais" value={alternative.result.fabrics.flatMap((fabric) => fabric.sizes).reduce((sum, size) => sum + Math.max(0, size.difference), 0)} /></dl>{alternative.result.fabrics.map((fabricResult) => { const fabric = fabrics.find((entry) => entry.id === fabricResult.fabricId)!; return <section className="cut-plan__fabric-result" key={fabric.id}><header><div><h3>{fabricLabel(fabric)}</h3><p>{fabric.widthCm} cm · {fabric.type === "TUBULAR" ? "Tubular" : "Plano"}</p></div><span>{countLabel(fabricResult.lays.length, "enfesto")}</span></header><div className="cut-plan__lays">{fabricResult.lays.map((lay, index) => <article className="cut-plan__lay" key={lay.id}>
      <div className="cut-plan__lay-header">
        <div className="cut-plan__lay-heading">
          <h4>Enfesto {String(index + 1).padStart(2, "0")}</h4>
          <ul className="cut-plan__grade">{lay.frequencies.map((marker) => <li key={marker.size}><Badge tone="info">{marker.frequency}{marker.size}</Badge></li>)}</ul>
          <p className="cut-plan__marker-length">{lay.markerLengthCm ? `Comprimento estimado: ${lay.markerLengthCm} cm de ${input.tableLengthCm} cm` : "Sem estimativa dimensional"}</p>
        </div>
        <p className="cut-plan__lay-layers"><span>{lay.layers}</span><small>{lay.layers === 1 ? "folha" : "folhas"}</small></p>
      </div>
      <ResultTable><thead><tr><th>Tamanho</th><th>Frequência</th><th>Peças cortadas</th></tr></thead><tbody>{lay.frequencies.map((marker) => <tr key={marker.size}><td>{marker.size}</td><td>{marker.frequency}</td><td>{marker.frequency * lay.layers}</td></tr>)}</tbody></ResultTable>
    </article>)}</div><div className="cut-plan__check"><h4>Conferência</h4><ResultTable><thead><tr><th>Tamanho</th><th>Pedido</th><th>Vai cortar</th><th>Diferença</th></tr></thead><tbody>{fabricResult.sizes.map((size) => <tr key={size.size}><td>{size.size}</td><td>{size.requested}</td><td>{size.produced}</td><td><span className={size.difference === 0 ? "is-exact" : "is-changed"}>{size.difference > 0 ? "+" : ""}{size.difference}</span></td></tr>)}</tbody></ResultTable></div></section>; })}</>;
}

function Panel({ number, title, action, children }: { number: string; title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="cut-plan__section"><div className="cut-plan__section-top"><div className="cut-plan__section-heading"><span aria-hidden="true">{number}</span><h2>{title}</h2></div>{action}</div>{children}</section>; }
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) { return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>; }
/**
 * Numero com rascunho local: sem ele, limpar o campo devolve `NaN` para o
 * estado e o input controlado quebra no meio da digitacao.
 */
function NumberField({ id, label, max, unit, value, integer, onChange }: { id: string; label: string; max?: number; unit?: string; value: number; integer?: boolean; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const control = <input id={id} max={max} min="1" step={integer ? 1 : "any"} type="number" value={draft ?? String(value)} onBlur={() => setDraft(null)} onChange={(event) => { setDraft(event.currentTarget.value); const next = event.currentTarget.valueAsNumber; if (!Number.isNaN(next)) onChange(next); }} />;
  // Sem unidade nao ha sufixo sobreposto: o input mantem o padding do `.field`.
  return <Field id={id} label={label}>{unit ? <div className="cut-plan__unit-input">{control}<span>{unit}</span></div> : control}</Field>;
}
function ResultTable({ children }: { children: React.ReactNode }) { return <div className="cut-plan__table-wrap"><table className="cut-plan__table">{children}</table></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
