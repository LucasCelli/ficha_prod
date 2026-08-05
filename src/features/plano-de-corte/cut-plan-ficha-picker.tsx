"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, Button, CustomDatalist, IconButton, type CustomDatalistHandle, type CustomDatalistOption } from "@/components/ui";
import type { CutPlanSourceFicha } from "./model";

type ApiResponse = { success: true; ficha?: CutPlanSourceFicha; fichas?: CutPlanSourceFicha[] } | { success: false; error: string };

function fichaLabel(ficha: CutPlanSourceFicha) {
  return `${ficha.client}${ficha.number ? ` · Venda ${ficha.number}` : ""}`;
}

export function CutPlanFichaPicker({ added, onAdd, onRemove }: { added: CutPlanSourceFicha[]; onAdd: (ficha: CutPlanSourceFicha, overwrite?: boolean) => boolean; onRemove: (id: string) => void }) {
  const [options, setOptions] = useState<CutPlanSourceFicha[]>([]);
  const [value, setValue] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingOverwrite, setPendingOverwrite] = useState<CutPlanSourceFicha | null>(null);
  const inputRef = useRef<CustomDatalistHandle>(null);
  const datalistOptions = useMemo<CustomDatalistOption[]>(() => options.map((ficha) => ({
    aliases: [ficha.client, ficha.number, ficha.material, ficha.color, ficha.id].filter(Boolean) as string[],
    details: [ficha.material, ficha.color, `${ficha.total} peça(s)`].filter(Boolean),
    id: ficha.id,
    imageUrl: ficha.imageUrl ?? undefined,
    label: fichaLabel(ficha),
    value: fichaLabel(ficha),
  })), [options]);

  async function search() {
    setLoading(true);
    try {
      const query = value.trim();
      const response = await fetch(`/api/ferramentas/plano-de-corte/fichas${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const payload = await response.json().catch(() => null) as ApiResponse | null;
      if (!response.ok || !payload?.success) return toast.error(payload && !payload.success ? payload.error : "Não foi possível carregar as fichas.");
      const fichas = payload.fichas ?? [];
      setOptions(fichas);
      if (!fichas.some((ficha) => ficha.id === selectedId)) setSelectedId("");
      if (!fichas.length) return toast.warning("Nenhuma ficha encontrada.");
      inputRef.current?.focusAndOpen();
      toast.success(fichas.length === 1 ? "1 ficha encontrada." : `${fichas.length} fichas encontradas.`);
    } finally { setLoading(false); }
  }

  async function add(fichaId = selectedId) {
    if (!fichaId) return toast.warning("Selecione uma ficha da lista.");
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/ferramentas/plano-de-corte/fichas?fichaId=${encodeURIComponent(fichaId)}`);
      const payload = await response.json().catch(() => null) as ApiResponse | null;
      if (!response.ok || !payload?.success || !payload.ficha) return toast.error(payload && !payload.success ? payload.error : "Não foi possível carregar a ficha.");
      if (added.some((ficha) => ficha.id === payload.ficha!.id)) {
        setPendingOverwrite(payload.ficha);
        return;
      }
      if (onAdd(payload.ficha)) { setValue(""); setSelectedId(""); }
    } finally { setLoading(false); }
  }

  return <><div className="cut-plan-fichas">
    <div className="cut-plan-fichas__search">
      <label className="cut-plan__field"><span>Ficha existente</span><CustomDatalist aria-label="Ficha para adicionar ao plano" id="cut-plan-ficha" onValueChange={(next, option) => { setValue(next); setSelectedId(option?.id ?? ""); if (option?.id) void add(option.id); }} options={datalistOptions} placeholder="Cliente ou venda" ref={inputRef} value={value} /></label>
      <Button disabled={loading} onClick={() => void search()} type="button" variant="secondary">{loading ? <span className="button-spinner" aria-hidden="true" /> : <Search size={16} />} Buscar</Button>
      <Button disabled={loading || !selectedId} onClick={() => void add(selectedId)} type="button"><Plus size={17} /> Adicionar ficha</Button>
    </div>
    {added.length ? <div className="cut-plan-fichas__added">{added.map((ficha) => <div key={ficha.id}><span><strong>{fichaLabel(ficha)}</strong><small>{[ficha.material, ficha.color, `${ficha.total} peça(s)`].filter(Boolean).join(" · ")}</small></span><IconButton label={`Remover ficha de ${ficha.client}`} onClick={() => onRemove(ficha.id)} size="sm" tone="danger"><X size={16} /></IconButton></div>)}</div> : null}
  </div>
    {pendingOverwrite ? <AlertDialog title="Sobrescrever ficha" description="As alterações manuais desta ficha serão substituídas." onClose={() => setPendingOverwrite(null)}><div className="cut-plan__dialog"><div className="modal-header"><div><h2>Sobrescrever esta ficha?</h2><AlertDialogDescription>Os tamanhos e quantidades atuais desta ficha serão removidos e importados novamente. As outras fichas não serão alteradas.</AlertDialogDescription></div></div><div className="modal-actions"><AlertDialogCancel asChild><Button variant="ghost">Cancelar</Button></AlertDialogCancel><AlertDialogAction asChild><Button onClick={() => { if (onAdd(pendingOverwrite, true)) { setValue(""); setSelectedId(""); } setPendingOverwrite(null); }}>Sobrescrever</Button></AlertDialogAction></div></div></AlertDialog> : null}
  </>;
}
