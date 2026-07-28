import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { requireSuperadmin } from "@/features/auth/session";
import { formatBusinessDateTime } from "@/lib/dates";
import { assignFichaOwnerAction } from "@/features/usuarios/profile-admin-actions";
import { getProfileAdminData, OWNERSHIP_PAGE_SIZE } from "@/features/usuarios/profile-admin";
import styles from "./ownership.module.css";

type Params=Record<string,string|string[]|undefined>;
export default async function PerfisAdminPage({searchParams}:{searchParams:Promise<Params>}) {
  await requireSuperadmin(); const params=await searchParams;
  const page=Math.max(1,Number(first(params.page)??"1")||1), busca=first(params.busca)??"", semAutor=first(params.semAutor)==="true";
  const result=await getProfileAdminData({page,busca,semAutor});
  if(result.kind==="error") return <EmptyState title="Gestão de autoria indisponível" description={result.message}/>;
  return <section className={styles.page}>
    <header className={styles.header}><div><p className="eyebrow">Administração</p><h1>Gestão de autoria</h1><p>Transfira a autoria com confirmação e registro de auditoria.</p></div><Link className="ui-button ui-button--secondary" href="/usuarios">Voltar</Link></header>
    <section className={styles.panel}>
      <div className={styles.title}><div><h2>Fichas e responsáveis</h2><p>Selecione uma ou mais fichas, inclusive já atribuídas.</p></div><Badge>{result.total}</Badge></div>
      <form className={styles.search}><input name="busca" defaultValue={busca} placeholder="Buscar cliente…"/><label><input type="checkbox" name="semAutor" value="true" defaultChecked={semAutor}/> Somente sem autor</label><button className="ui-button ui-button--secondary">Filtrar</button></form>
      <form action={assignFichaOwnerAction} className={styles.bulk} id="bulk-owner-form"><select name="userId" required defaultValue=""><option value="" disabled>Novo autor</option>{result.users.map((u)=><option value={u.id} key={u.id}>{u.display_name}</option>)}</select><input name="reason" required minLength={5} placeholder="Motivo da transferência"/><label><input type="checkbox" name="confirmed" required/> Confirmo a alteração e a auditoria</label><button className="ui-button ui-button--primary">Aplicar selecionadas</button></form>
      {result.fichas.length?<div className={styles.rows}>{result.fichas.map((ficha)=><article key={ficha.id}><input aria-label={`Selecionar ${ficha.cliente_nome_snapshot}`} form="bulk-owner-form" name="fichaIds" type="checkbox" value={ficha.id}/><div><strong>{ficha.cliente_nome_snapshot}</strong><small>Vendedor: {ficha.vendedor??"não informado"} · {formatBusinessDateTime(new Date(ficha.created_at))}</small></div><Badge tone={ficha.author?"info":"warning"}>{ficha.author?.display_name??"Sem autor"}</Badge><Link href={`/fichas/${ficha.id}`}>Abrir</Link></article>)}</div>:<EmptyState title="Nenhuma ficha encontrada" description="Ajuste os filtros."/>}
      <div className={styles.pagination}>{page>1&&<Link href={href(params,page-1)}>Anterior</Link>}<span>Página {page} de {Math.max(1,Math.ceil(result.total/OWNERSHIP_PAGE_SIZE))}</span>{page*OWNERSHIP_PAGE_SIZE<result.total&&<Link href={href(params,page+1)}>Próxima</Link>}</div>
    </section>
  </section>;
}
function first(v:string|string[]|undefined){return Array.isArray(v)?v[0]:v;}
function href(params:Params,page:number){const p=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{const x=first(v);if(x)p.set(k,x)});p.set("page",String(page));return `/usuarios/perfis?${p}`;}
