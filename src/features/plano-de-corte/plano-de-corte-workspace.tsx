"use client";

import { useCallback, useMemo, useState } from "react";
import { Calculator, Plus, Printer, RotateCcw, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, Badge, Button, CustomDatalist, IconButton, type CustomDatalistOption } from "@/components/ui";
import type { CatalogSizeForCutPlan } from "@/features/catalogos/data";
import { calculateCutPlanAlternatives, type CutPlanAlternative } from "./alternatives";
import { countLabel, CutPlanCalculationError } from "./calculator";
import { CutPlanFichaPicker } from "./cut-plan-ficha-picker";
import { CutPlanNativePrintLayer } from "./cut-plan-native-print-layer";
import { CutPlanItemsEditor, sortCutPlanItems } from "./cut-plan-items-editor";
import type { CutPlanFabric, CutPlanInput, CutPlanItem, CutPlanSourceFicha, FabricType } from "./model";
import { validateCutPlan } from "./validation";
import { formatEstimatedLengthMeters, getLayerLimit } from "./dimensions";

const createId = () => crypto.randomUUID();
type FabricCutSettings = Pick<CutPlanFabric, "type" | "widthCm">;

function getFabricCutSettings(option: CustomDatalistOption | undefined): Partial<FabricCutSettings> {
  if (!option) return {};
  const widthCm = Number(option?.metadata?.fabricWidthCm);
  const type = option?.metadata?.fabricType;
  if (!Number.isFinite(widthCm) || widthCm <= 0 || (type !== "PLANO" && type !== "TUBULAR")) return { widthCm: 0 };
  return { type, widthCm };
}

const createFabric = (name: string, base?: CutPlanFabric, settings: Partial<FabricCutSettings> = {}): CutPlanFabric => ({
  id: createId(),
  name,
  color: "",
  widthCm: settings.widthCm ?? base?.widthCm ?? 118,
  type: settings.type ?? base?.type ?? "TUBULAR",
});
const fabricLabel = (fabric: CutPlanFabric) => {
  const name = fabric.name.trim() || "Tecido";
  return `${name}${fabric.color.trim() ? ` — ${fabric.color.trim()}` : ""}`;
};

const normalizeMaterial = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().trim();

function hasMeasurements(size: CatalogSizeForCutPlan) {
  return [
    size.measure_front_height_cm, size.measure_front_width_cm, size.measure_back_height_cm, size.measure_back_width_cm,
    size.measure_short_sleeve_height_cm, size.measure_short_sleeve_width_cm,
    size.measure_long_sleeve_height_cm, size.measure_long_sleeve_width_cm,
  ]
    .every((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
}

export function PlanoDeCorteWorkspace({ catalogFabricOptions, catalogSizes }: { catalogFabricOptions: CustomDatalistOption[]; catalogSizes: CatalogSizeForCutPlan[] }) {
  const defaultFabricOption = catalogFabricOptions[0];
  const defaultFabricName = defaultFabricOption?.value ?? defaultFabricOption?.label ?? "";
  const defaultFabricSettings = getFabricCutSettings(defaultFabricOption);
  const [tableLengthCm, setTableLengthCm] = useState(800);
  const [maxLayers, setMaxLayers] = useState(50);
  const [fabrics, setFabrics] = useState<CutPlanFabric[]>(() => [createFabric(defaultFabricName, undefined, defaultFabricSettings)]);
  const [items, setItems] = useState<CutPlanItem[]>([]);
  const [sourceFichas, setSourceFichas] = useState<CutPlanSourceFicha[]>([]);
  const [alternatives, setAlternatives] = useState<CutPlanAlternative[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [printSelection, setPrintSelection] = useState<CutPlanAlternative[] | null>(null);
  const [calculating, setCalculating] = useState(false);
  const sizeProfiles = useMemo<CutPlanInput["sizeProfiles"]>(() => catalogSizes.filter(hasMeasurements).map((size) => ({
    aliases: size.aliases,
    backHeightCm: size.measure_back_height_cm!,
    backWidthCm: size.measure_back_width_cm!,
    frontHeightCm: size.measure_front_height_cm!,
    frontWidthCm: size.measure_front_width_cm!,
    id: size.id,
    longSleeveHeightCm: size.measure_long_sleeve_height_cm!,
    longSleeveWidthCm: size.measure_long_sleeve_width_cm!,
    shortSleeveHeightCm: size.measure_short_sleeve_height_cm!,
    shortSleeveWidthCm: size.measure_short_sleeve_width_cm!,
    size: size.name,
  })), [catalogSizes]);
  const sizeOptions = useMemo<CustomDatalistOption[]>(() => catalogSizes.map((size) => ({
    aliases: size.aliases,
    details: [hasMeasurements(size) ? "Medidas cadastradas" : "Sem medidas"],
    id: size.id,
    label: size.name,
    value: size.name,
  })), [catalogSizes]);
  const input = useMemo<CutPlanInput>(() => ({ tableLengthCm, maxLayers, fabrics, items, sizeProfiles, sourceFichaIds: sourceFichas.map((ficha) => ficha.id) }), [tableLengthCm, maxLayers, fabrics, items, sizeProfiles, sourceFichas]);
  const selected = alternatives.find((alternative) => alternative.id === selectedId) ?? alternatives[0];
  const invalidate = () => { setAlternatives([]); setSelectedId(""); };
  const findCatalogFabric = (name: string) => catalogFabricOptions.find((option) =>
    [option.value, option.label, ...(option.aliases ?? [])]
      .some((candidate) => candidate && normalizeMaterial(candidate) === normalizeMaterial(name)),
  );

  function updateFabric(fabricId: string, patch: Partial<CutPlanFabric>) {
    const sharedPatch = { ...(patch.widthCm !== undefined ? { widthCm: patch.widthCm } : {}), ...(patch.type ? { type: patch.type } : {}) };
    setFabrics((current) => current.map((fabric) => fabric.id === fabricId ? { ...fabric, ...patch } : { ...fabric, ...sharedPatch }));
    if (patch.type) setMaxLayers((current) => Math.min(current, getLayerLimit(patch.type!)));
    invalidate();
  }
  function addFabric() { setFabrics((current) => [...current, createFabric(defaultFabricName, current[0], defaultFabricSettings)]); invalidate(); }
  function removeFabric(fabricId: string) {
    if (items.some((item) => item.fabricId === fabricId)) return toast.error("Este tecido está em uso.", { description: "Troque o tecido dessas linhas antes de excluir." });
    setFabrics((current) => current.filter((fabric) => fabric.id !== fabricId)); invalidate();
  }
  function updateItem(itemId: string, patch: Partial<CutPlanItem>) { setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item)); invalidate(); }
  function addItem(afterId?: string) {
    if (!fabrics.length) return toast.error("Adicione um tecido antes.");
    const item: CutPlanItem = { id: createId(), fabricId: fabrics[0].id, size: "", sleeveType: "CURTA", quantity: 1 };
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
    const catalogFabric = findCatalogFabric(ficha.material);
    const canonicalMaterial = catalogFabric?.value ?? catalogFabric?.label ?? ficha.material.trim();
    const importedSource = { ...ficha, material: canonicalMaterial };
    const requiredMaterial = baseSources[0]?.material;
    const requiredCatalogFabric = requiredMaterial ? findCatalogFabric(requiredMaterial) : undefined;
    const canonicalRequiredMaterial = requiredCatalogFabric?.value ?? requiredCatalogFabric?.label ?? requiredMaterial;
    if (canonicalRequiredMaterial && normalizeMaterial(canonicalRequiredMaterial) !== normalizeMaterial(canonicalMaterial)) {
      toast.error("Esta ficha é de outro tecido.", { description: "O plano está usando " + requiredMaterial + "." });
      return false;
    }
    const importedFabricSettings = getFabricCutSettings(catalogFabric);
    let targetFabric = nextFabrics.find((fabric) => normalizeMaterial(fabric.name) === normalizeMaterial(canonicalMaterial) && normalizeMaterial(fabric.color) === normalizeMaterial(ficha.color));
    if (!targetFabric) {
      if (!existingSource && !baseItems.length && !baseSources.length && nextFabrics.length === 1) {
        targetFabric = { ...nextFabrics[0], name: canonicalMaterial, color: ficha.color, ...importedFabricSettings };
        nextFabrics = [targetFabric];
      } else {
        targetFabric = { ...createFabric(canonicalMaterial, nextFabrics[0] ?? fabrics[0], importedFabricSettings), color: ficha.color };
        nextFabrics = [...nextFabrics, targetFabric];
      }
    }
    const importedItems: CutPlanItem[] = ficha.items.map((item) => ({ id: createId(), fabricId: targetFabric.id, size: item.size, sleeveType: ficha.sleeveType, quantity: item.quantity, sourceFichaId: ficha.id }));
    setFabrics(nextFabrics);
    setMaxLayers((current) => Math.min(current, getLayerLimit(targetFabric.type)));
    setItems([...baseItems, ...importedItems]);
    setSourceFichas(existingSource ? sourceFichas.map((current) => current.id === ficha.id ? importedSource : current) : [...sourceFichas, importedSource]);
    invalidate();
    toast.success(existingSource ? "Ficha atualizada no plano." : "Ficha adicionada ao plano.");
    return true;
  }
  function removeSourceFicha(fichaId: string) {
    const remainingItems = items.filter((item) => item.sourceFichaId !== fichaId);
    const referencedFabricIds = new Set(remainingItems.map((item) => item.fabricId));
    const remainingFabrics = fabrics.filter((fabric) => referencedFabricIds.has(fabric.id));
    setItems(remainingItems);
    setFabrics(remainingFabrics.length ? remainingFabrics : [createFabric(defaultFabricName, fabrics[0], defaultFabricSettings)]);
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
  function clear() { setTableLengthCm(800); setMaxLayers(50); setFabrics([createFabric(defaultFabricName, undefined, defaultFabricSettings)]); setItems([]); setSourceFichas([]); setAlternatives([]); setConfirmClear(false); }
  const finishPrinting = useCallback(() => setPrintSelection(null), []);
  function printPlan(scope: "current" | "all") {
    if (!selected) return;
    setPrintSelection(scope === "all" ? alternatives : [selected]);
  }

  return <section className="cut-plan" aria-labelledby="cut-plan-title">
    <header className="cut-plan__header"><span aria-hidden="true"><Scissors size={24} /></span><div><h1 id="cut-plan-title">Plano de Corte</h1><p>Monte os enfestos antes de fazer o encaixe no Audaces.</p></div></header>
    <Panel number="1" title="Mesa e enfesto"><div className="cut-plan__settings"><NumberField id="cut-plan-table-length" label="Tamanho da mesa" unit="cm" value={tableLengthCm} onChange={(value) => { setTableLengthCm(value); invalidate(); }} /><NumberField key={fabrics[0]?.type ?? "TUBULAR"} id="cut-plan-max-layers" label="Máximo de folhas por enfesto" max={getLayerLimit(fabrics[0]?.type ?? "TUBULAR")} unit="folhas" integer value={maxLayers} onChange={(value) => { setMaxLayers(Math.min(value, getLayerLimit(fabrics[0]?.type ?? "TUBULAR"))); invalidate(); }} /></div></Panel>
    <Panel number="2" title="Tecidos" action={<Button variant="secondary" onClick={addFabric}><Plus size={17} /> Adicionar tecido</Button>}><div className="cut-plan__fabric-list">{fabrics.map((fabric, index) => <article className="cut-plan__fabric" key={fabric.id}><div className="cut-plan__fabric-title"><strong>{fabricLabel(fabric)}</strong><IconButton label={`Remover ${fabricLabel(fabric)}`} onClick={() => removeFabric(fabric.id)} size="sm" tone="danger"><Trash2 size={17} /></IconButton></div><div className="cut-plan__fabric-fields"><div className="field"><label htmlFor={`cut-plan-fabric-name-${fabric.id}`}>Tecido</label><CustomDatalist id={`cut-plan-fabric-name-${fabric.id}`} onValueChange={(value, option) => updateFabric(fabric.id, { name: value, ...getFabricCutSettings(option) })} options={catalogFabricOptions} placeholder="Escolha um tecido" value={fabric.name} /></div><Field id={`cut-plan-fabric-color-${fabric.id}`} label="Cor"><input id={`cut-plan-fabric-color-${fabric.id}`} value={fabric.color} placeholder="Ex.: Azul Marinho" onChange={(event) => updateFabric(fabric.id, { color: event.currentTarget.value })} /></Field><NumberField id={`cut-plan-fabric-width-${fabric.id}`} label="Largura" unit="cm" value={fabric.widthCm} onChange={(value) => updateFabric(fabric.id, { widthCm: value })} /><Field id={`cut-plan-fabric-type-${fabric.id}`} label="Plano ou tubular"><select id={`cut-plan-fabric-type-${fabric.id}`} value={fabric.type} onChange={(event) => updateFabric(fabric.id, { type: event.currentTarget.value as FabricType })}><option value="PLANO">Plano</option><option value="TUBULAR">Tubular</option></select></Field></div><small>{index ? "A largura e o tipo seguem o primeiro tecido." : fabric.type === "TUBULAR" ? "No tubular, a frequência de cada tamanho sai sempre em número par." : "A frequência de cada tamanho vai de 1 a 6."}</small></article>)}</div></Panel>
    <Panel number="3" title="Tamanhos e quantidades"><CutPlanFichaPicker added={sourceFichas} onAdd={addSourceFicha} onRemove={removeSourceFicha} /><CutPlanItemsEditor fabrics={fabrics} items={items} addItem={addItem} duplicateItem={duplicateItem} moveItem={moveItem} sizeOptions={sizeOptions} sortItems={sortItems} updateItem={updateItem} removeItem={(itemId) => { setItems((current) => current.filter((item) => item.id !== itemId)); invalidate(); }} /></Panel>
    <div className="form-actions"><Button variant="ghost" onClick={() => setConfirmClear(true)}><RotateCcw size={17} /> Limpar plano</Button><Button aria-busy={calculating} disabled={calculating} onClick={calculate}>{calculating ? <span className="button-spinner" aria-hidden="true" /> : <Calculator aria-hidden="true" size={18} />} {calculating ? "Calculando" : "Calcular plano"}</Button></div>
    {selected ? <Panel number="4" title="Resultado">
      <div className="cut-plan__result-toolbar"><div className="cut-plan__tabs" role="group" aria-label="Opções de plano">{alternatives.map((alternative) => <button aria-pressed={alternative.id === selected.id} className={alternative.id === selected.id ? "is-active" : ""} key={alternative.id} onClick={() => setSelectedId(alternative.id)} type="button"><span>{alternative.label}</span><small>{countLabel(alternative.layCount, "enfesto")}</small></button>)}</div></div><p className="cut-plan__alternative-description">{selected.description}</p><PlanResult alternative={selected} fabrics={fabrics} /><div className="cut-plan__print-actions cut-plan__print-actions--bottom"><Button onClick={() => printPlan("current")} variant="secondary"><Printer size={17} /> Imprimir esta</Button>{alternatives.length > 1 ? <Button onClick={() => printPlan("all")} variant="ghost"><Printer size={17} /> Imprimir todas</Button> : null}</div>
    </Panel> : null}
    {printSelection ? <CutPlanNativePrintLayer alternatives={printSelection} input={input} onPrinted={finishPrinting} /> : null}
    {confirmClear ? <AlertDialog title="Limpar plano" description="Os tecidos, os tamanhos, as quantidades e o resultado calculado serão apagados." onClose={() => setConfirmClear(false)}>
      <section className="confirm-dialog" aria-describedby="cut-plan-clear-description">
        <header className="confirm-dialog__header"><div><span className="confirm-dialog__eyebrow">Confirmação necessária</span><h2>Limpar este plano?</h2></div></header>
        <p id="cut-plan-clear-description">Os tecidos, os tamanhos, as quantidades e o resultado calculado serão apagados.</p>
        <div className="confirm-dialog__actions"><AlertDialogCancel asChild><Button variant="ghost">Cancelar</Button></AlertDialogCancel><AlertDialogAction asChild><Button variant="danger" onClick={clear}>Limpar plano</Button></AlertDialogAction></div>
      </section>
    </AlertDialog> : null}
  </section>;
}

function PlanResult({ alternative, fabrics }: { alternative: CutPlanAlternative; fabrics: CutPlanFabric[] }) {
  const lays = alternative.result.fabrics.flatMap((fabric) => fabric.lays); return <><dl className="cut-plan__summary"><Metric label="Tecidos" value={alternative.result.fabrics.length} /><Metric label="Enfestos" value={lays.length} /><Metric label="Total de folhas" value={lays.reduce((sum, lay) => sum + lay.layers, 0)} /><Metric label="Peças a mais" value={alternative.result.fabrics.flatMap((fabric) => fabric.sizes).reduce((sum, size) => sum + Math.max(0, size.difference), 0)} /></dl>{alternative.result.fabrics.map((fabricResult) => { const fabric = fabrics.find((entry) => entry.id === fabricResult.fabricId)!; const showSleeveType = new Set(fabricResult.sizes.map((size) => size.sleeveType)).size > 1; return <section className="cut-plan__fabric-result" key={fabric.id}><header><div><h3>{fabricLabel(fabric)}</h3><p>{fabric.widthCm} cm · {fabric.type === "TUBULAR" ? "Tubular" : "Plano"}</p></div><span>{countLabel(fabricResult.lays.length, "enfesto")}</span></header><div className="cut-plan__lays">{fabricResult.lays.map((lay, index) => <article className="cut-plan__lay" key={lay.id}>
      <div className="cut-plan__lay-header">
        <div className="cut-plan__lay-heading">
          <h4>Enfesto {String(index + 1).padStart(2, "0")}</h4>
          <ul className="cut-plan__grade">{lay.frequencies.map((marker) => <li key={`${marker.size}-${marker.sleeveType}`}><Badge tone="info">{marker.frequency}{marker.size}{showSleeveType ? ` · ${marker.sleeveType === "LONGA" ? "ML" : "MC"}` : ""}</Badge></li>)}</ul>
          {lay.markerLengthCm ? <p className="cut-plan__marker-length">Comprimento estimado: {formatEstimatedLengthMeters(lay.markerLengthCm)}</p> : null}
        </div>
        <p className="cut-plan__lay-layers"><span>{lay.layers}</span><small>{lay.layers === 1 ? "folha" : "folhas"}</small></p>
      </div>
      <ResultTable><thead><tr><th>Tamanho</th><th>Manga</th><th>Frequência</th><th>Peças cortadas</th></tr></thead><tbody>{lay.frequencies.map((marker) => <tr key={`${marker.size}-${marker.sleeveType}`}><td>{marker.size}</td><td>{marker.sleeveType === "LONGA" ? "Longa" : "Curta"}</td><td>{marker.frequency}</td><td>{marker.frequency * lay.layers}</td></tr>)}</tbody></ResultTable>
    </article>)}</div><div className="cut-plan__check"><h4>Conferência</h4><ResultTable><thead><tr><th>Tamanho</th><th>Manga</th><th>Pedido</th><th>Vai cortar</th><th>Diferença</th></tr></thead><tbody>{fabricResult.sizes.map((size) => <tr key={`${size.size}-${size.sleeveType}`}><td>{size.size}</td><td>{size.sleeveType === "LONGA" ? "Longa" : "Curta"}</td><td>{size.requested}</td><td>{size.produced}</td><td><span className={size.difference === 0 ? "is-exact" : "is-changed"}>{size.difference > 0 ? "+" : ""}{size.difference}</span></td></tr>)}</tbody></ResultTable></div></section>; })}</>;
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
