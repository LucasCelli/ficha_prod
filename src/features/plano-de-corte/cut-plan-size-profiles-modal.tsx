"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Modal } from "@/components/ui";
import { normalizeUniformSizeKey } from "@/lib/uniform-sizes";
import type { CutPlanSizeProfile } from "./model";

type DraftProfile = Omit<CutPlanSizeProfile, "aliases"> & { aliases: string };

const toDraft = (profile: CutPlanSizeProfile): DraftProfile => ({ ...profile, aliases: profile.aliases.join(", ") });
const createDraft = (): DraftProfile => ({
  id: crypto.randomUUID(),
  size: "",
  aliases: "",
  bodyHeightCm: 0,
  bodyWidthCm: 0,
  sleeveHeightCm: 0,
  sleeveWidthCm: 0,
});

export function CutPlanSizeProfilesModal({
  profiles,
  onClose,
  onSave,
}: {
  profiles: CutPlanSizeProfile[];
  onClose: () => void;
  onSave: (profiles: CutPlanSizeProfile[]) => void;
}) {
  const [drafts, setDrafts] = useState<DraftProfile[]>(() => profiles.length ? profiles.map(toDraft) : [createDraft()]);
  const [error, setError] = useState("");

  function updateProfile(id: string, patch: Partial<DraftProfile>) {
    setDrafts((current) => current.map((profile) => profile.id === id ? { ...profile, ...patch } : profile));
    setError("");
  }

  function save() {
    const normalized = drafts.map((profile) => ({
      ...profile,
      size: profile.size.trim().toUpperCase(),
      aliases: profile.aliases.split(/[,;\n]/).map((alias) => alias.trim().toUpperCase()).filter(Boolean),
    }));
    if (normalized.some((profile) => !profile.size || [profile.bodyHeightCm, profile.bodyWidthCm, profile.sleeveHeightCm, profile.sleeveWidthCm].some((value) => !Number.isFinite(value) || value <= 0))) {
      setError("Preencha o tamanho e todas as medidas com valores maiores que zero.");
      return;
    }
    const keys = normalized.flatMap((profile) => [profile.size, ...profile.aliases].map(normalizeUniformSizeKey));
    if (new Set(keys).size !== keys.length) {
      setError("Um tamanho ou alias foi usado em mais de um perfil.");
      return;
    }
    onSave(normalized);
  }

  return <Modal onClose={onClose} size="lg" title="Medidas por tamanho">
    <div className="modal-form cut-plan-profiles">
      <header className="modal-form__header">
        <h2>Medidas por tamanho</h2>
        <p>Corpo representa uma parte; manga representa uma manga. O cálculo considera duas partes de corpo e um par de mangas por camiseta.</p>
      </header>
      <div className="cut-plan-profiles__list">
        {drafts.map((profile, index) => <section className="cut-plan-profiles__item" key={profile.id}>
          <header><strong>Tamanho {String(index + 1).padStart(2, "0")}</strong><IconButton label={`Remover perfil ${profile.size || index + 1}`} onClick={() => setDrafts((current) => current.filter((item) => item.id !== profile.id))} size="sm" tone="danger"><Trash2 aria-hidden="true" size={16} /></IconButton></header>
          <div className="cut-plan-profiles__identity">
            <ProfileField label="Tamanho"><input value={profile.size} onChange={(event) => updateProfile(profile.id, { size: event.currentTarget.value })} placeholder="Ex.: M" /></ProfileField>
            <ProfileField label="Aliases"><input value={profile.aliases} onChange={(event) => updateProfile(profile.id, { aliases: event.currentTarget.value })} placeholder="Ex.: 50, MEDIO" /></ProfileField>
          </div>
          <div className="cut-plan-profiles__dimensions">
            <DimensionField label="Altura do corpo" value={profile.bodyHeightCm} onChange={(value) => updateProfile(profile.id, { bodyHeightCm: value })} />
            <DimensionField label="Largura do corpo" value={profile.bodyWidthCm} onChange={(value) => updateProfile(profile.id, { bodyWidthCm: value })} />
            <DimensionField label="Altura da manga" value={profile.sleeveHeightCm} onChange={(value) => updateProfile(profile.id, { sleeveHeightCm: value })} />
            <DimensionField label="Largura da manga" value={profile.sleeveWidthCm} onChange={(value) => updateProfile(profile.id, { sleeveWidthCm: value })} />
          </div>
        </section>)}
      </div>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <Button onClick={() => setDrafts((current) => [...current, createDraft()])} variant="secondary"><Plus aria-hidden="true" size={17} /> Adicionar tamanho</Button>
      <div className="form-actions"><Button onClick={onClose} variant="ghost">Cancelar</Button><Button onClick={save}>Salvar medidas</Button></div>
    </div>
  </Modal>;
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function DimensionField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <ProfileField label={label}><div className="cut-plan__unit-input"><input min="0.1" step="0.1" type="number" value={value || ""} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><span>cm</span></div></ProfileField>;
}
