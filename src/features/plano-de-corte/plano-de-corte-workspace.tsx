"use client";

import { useCallback, useMemo, useState } from "react";
import { Calculator, Plus, Printer, RotateCcw, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, Button, EmptyState, IconButton } from "@/components/ui";
import { calculateCutPlanAlternatives, type CutPlanAlternative } from "./alternatives";
import { CutPlanCalculationError, formatMarkerLabel, recalculateFabricResult } from "./calculator";
import { CutPlanFichaPicker } from "./cut-plan-ficha-picker";
import { CutPlanNativePrintLayer } from "./cut-plan-native-print-layer";
import { CutPlanItemsEditor, sortCutPlanItems } from "./cut-plan-items-editor";
import type { CutPlanFabric, CutPlanInput, CutPlanItem, CutPlanSourceFicha, FabricType } from "./model";
import { validateCutPlan } from "./validation";

const FABRICS = ["Malha PV", "Malha Fria", "Dry Fit", "Helanca", "Brim", "Oxford", "Piquet", "Meia Malha", "Moletom", "Suplex", "Microfibra", "Tactel", "Outro"];
const createId = () => crypto.randomUUID();
const createFabric = (base?: CutPlanFabric): CutPlanFabric => ({ id: createId(), name: "Malha PV", color: "", widthCm: base?.widthCm ?? 118, type: base?.type ?? "TUBULAR" });
const fabricLabel = (fabric: CutPlanFabric) => `${fabric.name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;

const normalizeMaterial = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().trim();

export function PlanoDeCorteWorkspace() {
  const [tableLengthCm, setTableLengthCm] = useState(800);
  const [maxLayers, setMaxLayers] = useState(30);
  const [fabrics, setFabrics] = useState<CutPlanFabric[]>(() => [createFabric()]);
  const [items, setItems] = useState<CutPlanItem[]>([]);
  const [sourceFichas, setSourceFichas] = useState<CutPlanSourceFicha[]>([]);
  const [alternatives, setAlternatives] = useState<CutPlanAlternative[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [printSelection, setPrintSelection] = useState<CutPlanAlternative[] | null>(null);
  const input = useMemo<CutPlanInput>(() => ({ tableLengthCm, maxLayers, fabrics, items, sourceFichaIds: sourceFichas.map((ficha) => ficha.id) }), [tableLengthCm, maxLayers, fabrics, items, sourceFichas]);
  const selected = alternatives.find((alternative) => alternative.id === selectedId) ?? alternatives[0];
  const invalidate = () => { setAlternatives([]); setSelectedId(""); };

  function updateFabric(fabricId: string, patch: Partial<CutPlanFabric>) {
    const sharedPatch = { ...(patch.widthCm !== undefined ? { widthCm: patch.widthCm } : {}), ...(patch.type ? { type: patch.type } : {}) };
    setFabrics((current) => current.map((fabric) => fabric.id === fabricId ? { ...fabric, ...patch } : { ...fabric, ...sharedPatch }));
    invalidate();
  }
  function addFabric() { setFabrics((current) => [...current, createFabric(current[0])]); invalidate(); }
  function removeFabric(fabricId: string) {
    if (items.some((item) => item.fabricId === fabricId)) return toast.error("Remova ou reassocie as quantidades deste tecido antes de excluí-lo.");
    setFabrics((current) => current.filter((fabric) => fabric.id !== fabricId)); invalidate();
  }
  function updateItem(itemId: string, patch: Partial<CutPlanItem>) { setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item)); invalidate(); }
  function addItem(afterId?: string) {
    if (!fabrics.length) return toast.error("Adicione um tecido primeiro.");
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
    if (!ficha.material.trim()) { toast.error("A ficha não possui tecido informado."); return false; }
    if (!ficha.items.length) { toast.error("A ficha não possui tamanhos e quantidades válidos."); return false; }
    const baseSources = overwrite ? sourceFichas.filter((current) => current.id !== ficha.id) : sourceFichas;
    const baseItems = overwrite ? items.filter((item) => item.sourceFichaId !== ficha.id) : items;
    const replacedFabricIds = new Set(items.filter((item) => item.sourceFichaId === ficha.id).map((item) => item.fabricId));
    const nextReferencedFabricIds = new Set(baseItems.map((item) => item.fabricId));
    let nextFabrics = overwrite
      ? fabrics.filter((fabric) => !replacedFabricIds.has(fabric.id) || nextReferencedFabricIds.has(fabric.id))
      : fabrics;
    const requiredMaterial = baseSources[0]?.material;
    if (requiredMaterial && normalizeMaterial(requiredMaterial) !== normalizeMaterial(ficha.material)) {
      toast.error("Esta ficha usa outro tecido.", { description: "O plano atual utiliza " + requiredMaterial + "." });
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
      toast.error("Revise os dados do plano", { description: issues.join(" ") });
      return;
    }
    try { const generated = calculateCutPlanAlternatives(input); setAlternatives(generated); setSelectedId(generated[0]?.id ?? ""); toast.success(`${generated.length} alternativa(s) calculada(s).`); }
    catch (error) {
      setAlternatives([]);
      toast.error("Não foi possível calcular o plano", { description: error instanceof CutPlanCalculationError ? error.message : "Tente novamente." });
    }
  }
  function clear() { setTableLengthCm(800); setMaxLayers(30); setFabrics([createFabric()]); setItems([]); setSourceFichas([]); setAlternatives([]); setConfirmClear(false); }
  function updateLay(fabricId: string, layId: string, layers: number, size?: string, frequency?: number) {
    setAlternatives((current) => current.map((alternative) => alternative.id !== selected?.id ? alternative : { ...alternative, result: { fabrics: alternative.result.fabrics.map((fabricResult) => {
      if (fabricResult.fabricId !== fabricId) return fabricResult;
      const lays = fabricResult.lays.map((lay) => lay.id !== layId ? lay : { ...lay, layers, frequencies: lay.frequencies.map((marker) => marker.size === size && frequency !== undefined ? { ...marker, frequency } : marker) });
      return recalculateFabricResult(input, fabricId, lays);
    }) } }));
  }
  const finishPrinting = useCallback(() => setPrintSelection(null), []);
  function printPlan(scope: "current" | "all") {
    if (!selected) return;
    setPrintSelection(scope === "all" ? alternatives : [selected]);
  }

  return <section className="cut-plan" aria-labelledby="cut-plan-title">
    <header className="cut-plan__header"><span aria-hidden="true"><Scissors size={24} /></span><div><h1 id="cut-plan-title">Plano de Corte</h1><p>Planeje tecidos, quantidades e enfestos antes de montar os encaixes no Audaces.</p></div></header>
    <Panel number="1" title="Configurações do plano" description="A largura e o tipo são únicos para todos os tecidos deste plano."><div className="cut-plan__settings"><NumberField label="Comprimento da mesa" unit="cm" value={tableLengthCm} onChange={(value) => { setTableLengthCm(value); invalidate(); }} /><NumberField label="Máximo de folhas por enfesto" unit="folhas" integer value={maxLayers} onChange={(value) => { setMaxLayers(value); invalidate(); }} /></div></Panel>
    <Panel number="2" title="Tecidos" description="Cores e identificações podem variar; largura e tipo permanecem iguais." action={<Button variant="secondary" onClick={addFabric}><Plus size={17} /> Adicionar tecido</Button>}><div className="cut-plan__fabric-list">{fabrics.map((fabric, index) => <article className="cut-plan__fabric" key={fabric.id}><div className="cut-plan__fabric-title"><strong>Tecido {String(index + 1).padStart(2, "0")}</strong><IconButton label={`Remover ${fabricLabel(fabric)}`} onClick={() => removeFabric(fabric.id)} size="sm" tone="danger"><Trash2 size={17} /></IconButton></div><div className="cut-plan__fabric-fields"><Field label="Tecido"><select value={FABRICS.includes(fabric.name) ? fabric.name : "Outro"} onChange={(event) => updateFabric(fabric.id, { name: event.currentTarget.value })}>{FABRICS.map((name) => <option key={name}>{name}</option>)}</select>{fabric.name === "Outro" || !FABRICS.includes(fabric.name) ? <input aria-label="Nome do tecido" value={fabric.name === "Outro" ? "" : fabric.name} placeholder="Informe o tecido" onChange={(event) => updateFabric(fabric.id, { name: event.currentTarget.value || "Outro" })} /> : null}</Field><Field label="Cor / identificação"><input value={fabric.color} placeholder="Ex.: Azul Marinho" onChange={(event) => updateFabric(fabric.id, { color: event.currentTarget.value })} /></Field><NumberField label="Largura do tecido" unit="cm" value={fabric.widthCm} onChange={(value) => updateFabric(fabric.id, { widthCm: value })} /><Field label="Tipo do tecido"><select value={fabric.type} onChange={(event) => updateFabric(fabric.id, { type: event.currentTarget.value as FabricType })}><option value="PLANO">Plano</option><option value="TUBULAR">Tubular</option></select></Field></div><small>{index ? "Largura e tipo sincronizados com o plano." : fabric.type === "TUBULAR" ? "Cada frequência por tamanho precisa ser par." : "Aceita frequências inteiras de 1 a 6."}</small></article>)}</div></Panel>
    <Panel number="3" title="Tamanhos e quantidades" description="Busque fichas existentes ou edite as linhas manualmente."><CutPlanFichaPicker added={sourceFichas} onAdd={addSourceFicha} onRemove={removeSourceFicha} /><CutPlanItemsEditor fabrics={fabrics} items={items} addItem={addItem} duplicateItem={duplicateItem} moveItem={moveItem} sortItems={sortItems} updateItem={updateItem} removeItem={(itemId) => { setItems((current) => current.filter((item) => item.id !== itemId)); invalidate(); }} /></Panel>
    <div className="cut-plan__actions"><Button onClick={calculate}><Calculator size={18} /> Calcular plano</Button><Button variant="ghost" onClick={() => setConfirmClear(true)}><RotateCcw size={17} /> Limpar plano</Button></div>
    <Panel number="4" title="Plano calculado" description="A opção principal sempre prioriza a menor quantidade de mapas.">
      {!selected ? <EmptyState title="Pronto para calcular" description="Adicione os tecidos e as quantidades para gerar uma sugestão de enfestos." /> : <><div className="cut-plan__result-toolbar"><div className="cut-plan__tabs" role="tablist" aria-label="Alternativas do plano">{alternatives.map((alternative) => <button aria-selected={alternative.id === selected.id} className={alternative.id === selected.id ? "is-active" : ""} key={alternative.id} onClick={() => setSelectedId(alternative.id)} role="tab" type="button"><span>{alternative.label}</span><small>{alternative.layCount} enfesto(s)</small></button>)}</div><div className="cut-plan__print-actions"><Button onClick={() => printPlan("current")} variant="secondary"><Printer size={17} /> Imprimir atual</Button>{alternatives.length > 1 ? <Button onClick={() => printPlan("all")} variant="ghost"><Printer size={17} /> Imprimir todas</Button> : null}</div></div><p className="cut-plan__alternative-description">{selected.description}</p><PlanResult alternative={selected} fabrics={fabrics} maxLayers={maxLayers} updateLay={updateLay} /></>}
    </Panel>
    {printSelection ? <CutPlanNativePrintLayer alternatives={printSelection} input={input} onPrinted={finishPrinting} /> : null}
    {confirmClear ? <AlertDialog title="Limpar plano" description="Todos os dados serão removidos." onClose={() => setConfirmClear(false)}><div className="cut-plan__dialog"><div className="modal-header"><div><h2>Limpar este plano?</h2><AlertDialogDescription>Todos os tecidos, quantidades, alternativas e ajustes serão removidos.</AlertDialogDescription></div></div><div className="modal-actions"><AlertDialogCancel asChild><Button variant="ghost">Cancelar</Button></AlertDialogCancel><AlertDialogAction asChild><Button variant="danger" onClick={clear}>Limpar plano</Button></AlertDialogAction></div></div></AlertDialog> : null}
  </section>;
}

function PlanResult({ alternative, fabrics, maxLayers, updateLay }: { alternative: CutPlanAlternative; fabrics: CutPlanFabric[]; maxLayers: number; updateLay: (fabricId: string, layId: string, layers: number, size?: string, frequency?: number) => void }) {
  const lays = alternative.result.fabrics.flatMap((fabric) => fabric.lays); return <><dl className="cut-plan__summary"><Metric label="Tecidos" value={alternative.result.fabrics.length} /><Metric label="Enfestos" value={lays.length} /><Metric label="Folhas totais" value={lays.reduce((sum, lay) => sum + lay.layers, 0)} /><Metric label="Peças excedentes" value={alternative.result.fabrics.flatMap((fabric) => fabric.sizes).reduce((sum, size) => sum + Math.max(0, size.difference), 0)} /></dl>{alternative.result.fabrics.map((fabricResult) => { const fabric = fabrics.find((entry) => entry.id === fabricResult.fabricId)!; return <section className="cut-plan__fabric-result" key={fabric.id}><header><div><h3>{fabricLabel(fabric)}</h3><p>{fabric.widthCm} cm · {fabric.type === "TUBULAR" ? "Tubular" : "Plano"}</p></div><span>{fabricResult.lays.length} enfesto(s)</span></header><div className="cut-plan__lays">{fabricResult.lays.map((lay, index) => <article className="cut-plan__lay" key={lay.id}><div className="cut-plan__lay-header"><div><small>Enfesto {String(index + 1).padStart(2, "0")}</small><NumberField label="Folhas" integer value={lay.layers} onChange={(value) => updateLay(fabric.id, lay.id, Math.max(1, Math.min(maxLayers, Math.round(value || 1))))} /></div><div><small>Sugestão de grade</small><strong>{formatMarkerLabel(lay.frequencies)}</strong>{fabric.type === "TUBULAR" ? <span className="cut-plan__audaces-grade">No Audaces: {formatMarkerLabel(lay.frequencies.map((marker) => ({ ...marker, frequency: marker.frequency / 2 })))}</span> : null}</div></div><ResultTable><thead><tr><th>Tamanho</th><th>Frequência</th><th>Folhas</th><th>Peças cortadas</th></tr></thead><tbody>{lay.frequencies.map((marker) => <tr key={marker.size}><td>{marker.size}</td><td><input aria-label={`Frequência de ${marker.size}`} max="6" min={fabric.type === "TUBULAR" ? 2 : 1} step={fabric.type === "TUBULAR" ? 2 : 1} type="number" value={marker.frequency} onChange={(event) => { const value = event.currentTarget.valueAsNumber || 1; updateLay(fabric.id, lay.id, lay.layers, marker.size, fabric.type === "TUBULAR" ? Math.max(2, Math.min(6, Math.round(value / 2) * 2)) : Math.max(1, Math.min(6, Math.round(value)))); }} /></td><td>{lay.layers}</td><td>{marker.frequency * lay.layers}</td></tr>)}</tbody></ResultTable></article>)}</div><div className="cut-plan__check"><h4>Conferência</h4><ResultTable><thead><tr><th>Tamanho</th><th>Solicitado</th><th>Produzido</th><th>Saldo</th></tr></thead><tbody>{fabricResult.sizes.map((size) => <tr key={size.size}><td>{size.size}</td><td>{size.requested}</td><td>{size.produced}</td><td><span className={size.difference === 0 ? "is-exact" : "is-changed"}>{size.difference > 0 ? "+" : ""}{size.difference}</span></td></tr>)}</tbody></ResultTable></div></section>; })}<p className="cut-plan__notice">As grades são sugestões operacionais. Confirme no Audaces se cada composição cabe fisicamente no tecido e na mesa.</p></>;
}

function Panel({ number, title, description, action, children }: { number: string; title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="cut-plan__section"><div className="cut-plan__section-top"><div className="cut-plan__section-heading"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>{action}</div>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="cut-plan__field"><span>{label}</span>{children}</label>; }
function NumberField({ label, unit, value, integer, onChange }: { label: string; unit?: string; value: number; integer?: boolean; onChange: (value: number) => void }) { return <Field label={label}><div className="cut-plan__unit-input"><input min="1" step={integer ? 1 : "any"} type="number" value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} />{unit ? <span>{unit}</span> : null}</div></Field>; }
function ResultTable({ children }: { children: React.ReactNode }) { return <div className="cut-plan__table-wrap"><table className="cut-plan__table cut-plan__table--result">{children}</table></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
