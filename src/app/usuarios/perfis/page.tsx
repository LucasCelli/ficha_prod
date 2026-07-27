import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { requireSuperadmin } from "@/features/auth/session";
import { formatBusinessDateTime } from "@/lib/dates";
import { assignFichaOwnerAction, saveMonthlyGoalAction } from "@/features/usuarios/profile-admin-actions";
import { getProfileAdminData } from "@/features/usuarios/profile-admin";
import styles from "./page.module.css";

export default async function PerfisAdminPage() {
  await requireSuperadmin();
  const result = await getProfileAdminData();
  if (result.kind === "error") return <EmptyState title="Gestão de perfis indisponível" description={result.message} />;
  const goals = new Map(result.goals.map((goal) => [goal.user_id, goal]));

  return <section className={styles.page}>
    <header className={styles.header}><div><p className="eyebrow">Administração</p><h1>Metas e autoria</h1><p>Configure metas mensais e revise fichas que ainda não possuem autor.</p></div><Link className="ui-button ui-button--secondary" href="/usuarios">Voltar</Link></header>
    <section className={styles.panel}><div className={styles.title}><h2>Metas de {result.month.slice(0, 7)}</h2><Badge>{result.users.length}</Badge></div>
      <div className={styles.goals}>{result.users.map((user) => { const goal = goals.get(user.id); return (
        <form action={saveMonthlyGoalAction} key={user.id}><div><strong>{user.display_name}</strong><small>@{user.username}</small></div>
          <input type="hidden" name="userId" value={user.id}/><input type="hidden" name="month" value={result.month}/>
          <label>Fichas<input min="0" name="fichas" type="number" defaultValue={goal?.fichas_target ?? 0}/></label>
          <label>Peças<input min="0" name="pieces" type="number" defaultValue={goal?.pieces_target ?? 0}/></label>
          <button className="ui-button ui-button--secondary">Salvar</button>
        </form>); })}</div>
    </section>
    <section className={styles.panel}><div className={styles.title}><div><h2>Fichas sem autor</h2><p>Até 100 registros recentes aguardando revisão.</p></div><Badge tone={result.unassigned.length ? "warning" : "success"}>{result.unassigned.length}</Badge></div>
      {result.unassigned.length ? <div className={styles.rows}>{result.unassigned.map((ficha) => (
        <form action={assignFichaOwnerAction} key={ficha.id}><div><strong>{ficha.cliente_nome_snapshot}</strong><small>Vendedor: {ficha.vendedor ?? "não informado"} · {formatBusinessDateTime(new Date(ficha.created_at))}</small></div>
          <input type="hidden" name="fichaId" value={ficha.id}/><input type="hidden" name="vendor" value={ficha.vendedor ?? ""}/>
          <select name="userId" required defaultValue=""><option value="" disabled>Escolher autor</option>{result.users.map((user) => <option value={user.id} key={user.id}>{user.display_name}</option>)}</select>
          <button className="ui-button ui-button--secondary">Atribuir</button>
          {ficha.vendedor && <button className="ui-button ui-button--secondary" name="bulk" value="true">Atribuir mesmo vendedor</button>}
        </form>))}</div> : <EmptyState title="Tudo revisado" description="Não há fichas sem autoria." /> }
    </section>
  </section>;
}
