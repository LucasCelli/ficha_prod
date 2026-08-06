"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, Button, CustomDatalist, IconButton, type CustomDatalistHandle, type CustomDatalistOption } from "@/components/ui";
import { countLabel } from "./calculator";
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
    details: [ficha.material, ficha.color, countLabel(ficha.total, "peça")].filter(Boolean),
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
      if (!fichas.length) return toast.warning("Nenhuma ficha encontrada.", { description: "Tente pelo nome do cliente ou pelo número da venda." });
      inputRef.current?.focusAndOpen();
      toast.success(fichas.length === 1 ? "1 ficha encontrada." : `${fichas.length} fichas encontradas.`);
    } finally { setLoading(false); }
  }

  async function add(fichaId = selectedId) {
    if (!fichaId) return toast.warning("Escolha uma ficha da lista.");
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
      <div className="field"><label htmlFor="cut-plan-ficha">Pesquisar ficha</label><CustomDatalist id="cut-plan-ficha" onValueChange={(next, option) => { setValue(next); setSelectedId(option?.id ?? ""); if (option?.id) void add(option.id); }} options={datalistOptions} placeholder="Nome do cliente ou número da venda" ref={inputRef} value={value} /></div>
      <Button disabled={loading} onClick={() => void search()} type="button" variant="secondary">{loading ? <span className="button-spinner" aria-hidden="true" /> : <Search size={16} />} Buscar</Button>
      <Button disabled={loading || !selectedId} onClick={() => void add(selectedId)} type="button"><Plus size={17} /> Adicionar ficha</Button>
    </div>
    {added.length ? <div className="cut-plan-fichas__added">{added.map((ficha) => <div key={ficha.id}><span><strong>{fichaLabel(ficha)}</strong><small>{[ficha.material, ficha.color, countLabel(ficha.total, "peça")].filter(Boolean).join(" · ")}</small></span><IconButton label={`Remover ficha de ${ficha.client}`} onClick={() => onRemove(ficha.id)} size="sm" tone="danger"><X size={16} /></IconButton></div>)}</div> : null}
  </div>
    {pendingOverwrite ? <AlertDialog title="Atualizar ficha" description="Os tamanhos e as quantidades desta ficha serão trocados pelos que estão na ficha agora." onClose={() => setPendingOverwrite(null)}>
      <section className="confirm-dialog" aria-describedby="cut-plan-overwrite-description">
        <header className="confirm-dialog__header"><div><span className="confirm-dialog__eyebrow">Confirmação necessária</span><h2>Esta ficha já está no plano. Atualizar?</h2></div></header>
        <p id="cut-plan-overwrite-description">Os tamanhos e as quantidades dela serão trocados pelos que estão na ficha agora. As outras fichas não mudam.</p>
        <div className="confirm-dialog__actions"><AlertDialogCancel asChild><Button variant="ghost">Cancelar</Button></AlertDialogCancel><AlertDialogAction asChild><Button onClick={() => { if (onAdd(pendingOverwrite, true)) { setValue(""); setSelectedId(""); } setPendingOverwrite(null); }}>Atualizar</Button></AlertDialogAction></div>
      </section>
    </AlertDialog> : null}
  </>;
}
