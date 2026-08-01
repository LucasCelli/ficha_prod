import Link from "next/link";
import type { Metadata } from "next";
import { Badge, EmptyState } from "@/components/ui";
import { requireSuperadmin } from "@/features/auth/session";
import { getProfileAdminData, OWNERSHIP_PAGE_SIZE } from "@/features/usuarios/profile-admin";
import { OwnershipSelection } from "./ownership-selection";
import styles from "./ownership.module.css";

export const metadata: Metadata = {
  title: "Gestão de autoria | Fichas Técnicas",
};

type Params=Record<string,string|string[]|undefined>;
export default async function PerfisAdminPage({searchParams}:{searchParams:Promise<Params>}) {
  await requireSuperadmin(); const params=await searchParams;
  const page=Math.max(1,Number(first(params.page)??"1")||1), busca=first(params.busca)??"", autor=first(params.autor)??"", semAutor=first(params.semAutor)==="true";
  const result=await getProfileAdminData({page,busca,autor,semAutor});
  if(result.kind==="error") return <EmptyState title="Gestão de autoria indisponível" description={result.message}/>;
  return <section className={styles.page}>
    <header className={styles.header}><div><p className="eyebrow">Administração</p><h1>Gestão de autoria</h1><p>Transfira a autoria com confirmação e registro de auditoria.</p></div><Link className="ui-button ui-button--secondary" href="/usuarios">Voltar</Link></header>
    <section className={styles.panel}>
      <div className={styles.title}><div><h2>Fichas e responsáveis</h2><p>Selecione uma ou mais fichas, inclusive já atribuídas.</p></div><Badge>{result.total}</Badge></div>
      <form className={styles.search}><label className="sr-only" htmlFor="perfis-busca">Buscar cliente</label><input id="perfis-busca" name="busca" defaultValue={busca} placeholder="Buscar cliente…"/><label className="sr-only" htmlFor="perfis-autor">Filtrar por autor</label><select id="perfis-autor" name="autor" defaultValue={autor}><option value="">Todos os autores</option>{result.users.map((u)=><option value={u.id} key={u.id}>{u.display_name}</option>)}</select><label><input type="checkbox" name="semAutor" value="true" defaultChecked={semAutor}/> Somente sem autor</label><button className="ui-button ui-button--secondary">Filtrar</button></form>
      {result.fichas.length?<OwnershipSelection fichas={result.fichas} users={result.users}/>:<EmptyState title="Nenhuma ficha encontrada" description="Ajuste os filtros."/>}
      <div className={styles.pagination}>{page>1&&<Link href={href(params,page-1)}>Anterior</Link>}<span>Página {page} de {Math.max(1,Math.ceil(result.total/OWNERSHIP_PAGE_SIZE))}</span>{page*OWNERSHIP_PAGE_SIZE<result.total&&<Link href={href(params,page+1)}>Próxima</Link>}</div>
    </section>
  </section>;
}
function first(v:string|string[]|undefined){return Array.isArray(v)?v[0]:v;}
function href(params:Params,page:number){const p=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{const x=first(v);if(x)p.set(k,x)});p.set("page",String(page));return `/usuarios/perfis?${p}`;}
