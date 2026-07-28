"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui";
import { FichaRowThumbnail } from "@/features/fichas/ficha-row-thumbnail";
import { assignFichaOwnerAction } from "@/features/usuarios/profile-admin-actions";
import { formatBusinessDateTime } from "@/lib/dates";
import styles from "./ownership.module.css";

type User = { id: string; display_name: string };
type Ficha = {
  id: string;
  cliente_nome_snapshot: string;
  vendedor: string | null;
  created_at: string;
  created_by_user_id: string | null;
  author: { display_name: string } | null;
  ficha_imagens: { url: string }[] | null;
};

export function OwnershipSelection({ fichas, users }: { fichas: Ficha[]; users: User[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState("");
  const [authors, setAuthors] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(fichas.map((ficha) => [ficha.id, ficha.created_by_user_id])),
  );
  const [isPending, startTransition] = useTransition();
  const userNames = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user.display_name])), [users]);
  const allSelected = fichas.length > 0 && selected.size === fichas.length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(fichas.map((ficha) => ficha.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await assignFichaOwnerAction({ userId, fichaIds: [...selected] });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setAuthors((current) => {
        const next = { ...current };
        result.changedIds.forEach((id) => { next[id] = result.userId; });
        return next;
      });
      setSelected(new Set());
      toast.success(result.message);
    });
  }

  return (
    <>
      <form className={styles.bulk} onSubmit={submit}>
        <select aria-label="Novo autor" onChange={(event) => setUserId(event.target.value)} required value={userId}>
          <option value="" disabled>Novo autor</option>
          {users.map((user) => <option value={user.id} key={user.id}>{user.display_name}</option>)}
        </select>
        <button className="ui-button ui-button--primary" disabled={isPending || selected.size === 0}>
          {isPending ? "Aplicando…" : "Aplicar selecionadas"}
        </button>
      </form>
      <label className={styles.selectAll}>
        <input type="checkbox" checked={allSelected} onChange={(event) => toggleAll(event.currentTarget.checked)} />
        Marcar todos
      </label>
      <div className={styles.rows}>
        {fichas.map((ficha) => {
          const authorId = authors[ficha.id];
          const authorName = authorId ? userNames[authorId] ?? ficha.author?.display_name ?? "Autor não encontrado" : "Sem autor";
          return <article key={ficha.id}>
            <input aria-label={`Selecionar ${ficha.cliente_nome_snapshot}`} checked={selected.has(ficha.id)} onChange={(event) => toggleOne(ficha.id, event.currentTarget.checked)} type="checkbox" />
            <FichaRowThumbnail alt={ficha.cliente_nome_snapshot} imageUrl={ficha.ficha_imagens?.[0]?.url} />
            <div><strong>{ficha.cliente_nome_snapshot}</strong><small>Vendedor: {ficha.vendedor ?? "não informado"} · {formatBusinessDateTime(new Date(ficha.created_at))}</small></div>
            <Badge tone={authorId ? "info" : "warning"}>{authorName}</Badge>
            <Link href={`/fichas/${ficha.id}`}>Abrir</Link>
          </article>;
        })}
      </div>
    </>
  );
}
