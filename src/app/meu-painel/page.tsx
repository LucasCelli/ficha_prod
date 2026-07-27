import Link from "next/link";
import { BarChart3, CalendarClock, CheckCircle2, Clock3, FilePlus2, FileText, Package } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import { requireAppSession } from "@/features/auth/session";
import { getPersonalDashboardData } from "@/features/meu-painel/data";
import { formatBusinessDateTime } from "@/lib/dates";
import styles from "./page.module.css";

type Params = Record<string, string | string[] | undefined>;
export default async function MeuPainelPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [session, params] = await Promise.all([requireAppSession(), searchParams]);
  const period = first(params.period) ?? "mes";
  const status = first(params.status) ?? "todos";
  const busca = first(params.busca) ?? "";
  const page = Number(first(params.page) ?? "1");
  const result = await getPersonalDashboardData({
    userId: session.user.id, displayName: session.user.displayName, username: session.user.username, role: session.user.role,
    period, status, busca, page: Number.isFinite(page) ? page : 1,
  });
  if (result.kind !== "ok") return <EmptyState title="Meu perfil indisponível" description={result.kind === "error" ? result.message : "Configure o banco de dados."} />;
  const { data } = result;
  const maxPoint = Math.max(1, ...data.series.map((point) => point.total));
  const metrics = [
    ["Fichas", data.metrics.fichas, FileText], ["Peças", data.metrics.pieces, Package],
    ["Pendentes", data.metrics.pendentes, Clock3], ["Entregues", data.metrics.entregues, CheckCircle2],
    ["Atrasadas", data.metrics.atrasadas, CalendarClock],
  ] as const;
  const distributionTotal = Math.max(1, data.metrics.pendentes + data.metrics.entregues + data.metrics.canceladas);

  return <section className={styles.page} aria-labelledby="personal-title">
    <header className={styles.hero}>
      <div className={styles.identity}><span className={styles.avatar}>{initials(data.user.displayName)}</span><div>
        <p className="eyebrow">Meu perfil</p><h1 id="personal-title">{data.user.displayName}</h1>
        <div className={styles.periods}>
          <Badge tone="neutral">@{data.user.username}</Badge>
          <Badge tone="info">{data.user.role === "superadmin" ? "Superadministrador" : "Operador"}</Badge>
        </div>
        <small>Último acesso: {data.lastLoginAt ? formatBusinessDateTime(new Date(data.lastLoginAt)) : "primeiro acesso"}</small>
      </div></div>
      <Link className="ui-button ui-button--primary" href="/fichas/nova"><FilePlus2 size={17}/> Nova ficha</Link>
    </header>

    <nav className={styles.periods} aria-label="Período das estatísticas">
      {[["mes","Mês atual"],["7","7 dias"],["30","30 dias"],["90","90 dias"]].map(([value,label]) =>
        <Link className={period === value ? styles.activePeriod : ""} href={withParams(params,{period:value,page:null})} key={value}>{label}</Link>)}
    </nav>
    <div className={styles.metrics}>{metrics.map(([label,value,Icon]) =>
      <article className={styles.metric} key={label}><Icon size={18}/><span>{label}</span><strong>{number(value)}</strong></article>)}</div>

    <div className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><div><p className="eyebrow">Produtividade</p><h2>Evolução no período</h2></div>
          <Badge tone={data.comparison !== null && data.comparison >= 0 ? "success" : "danger"}>{data.comparison === null ? "Sem comparação" : `${data.comparison >= 0 ? "+" : ""}${data.comparison.toFixed(0)}%`}</Badge></div>
        <div className={styles.chart}>{data.series.map((point) => <span key={point.date} title={`${point.date}: ${point.total}`} style={{height:`${Math.max(4,(point.total/maxPoint)*100)}%`}}/>)}</div>
        <div className={styles.insights}><span><strong>{data.metrics.noPrazo}</strong> entregas no prazo</span><span><strong>{data.averageLeadDays === null ? "—" : data.averageLeadDays.toFixed(1)}</strong> dias médios</span><span><strong>{data.allTimeTotal}</strong> fichas no histórico</span></div>
        <h3 className={styles.subheading}>Distribuição por status</h3>
        <div className={styles.distribution}>
          <Distribution label="Pendentes" value={data.metrics.pendentes} total={distributionTotal}/>
          <Distribution label="Entregues" value={data.metrics.entregues} total={distributionTotal}/>
          <Distribution label="Canceladas" value={data.metrics.canceladas} total={distributionTotal}/>
        </div>
      </section>
      <aside className={styles.panel}>
        <div className={styles.panelTitle}><div><p className="eyebrow">Meta mensal</p><h2>Progresso</h2></div><BarChart3 size={20}/></div>
        {data.goal ? <div className={styles.goals}>
          <Goal label="Fichas" current={data.goal.currentFichas} target={data.goal.fichas} projection={data.goal.projectedFichas}/>
          <Goal label="Peças" current={data.goal.currentPieces} target={data.goal.pieces} projection={data.goal.projectedPieces}/>
        </div> : <p className={styles.muted}>Nenhuma meta configurada para este mês.</p>}
        <h3 className={styles.subheading}>Próximas entregas</h3><FichaLinks rows={data.upcoming}/>
        {data.idle.length > 0 && <><h3 className={styles.subheading}>Sem movimentação há 7 dias</h3><FichaLinks rows={data.idle}/></>}
      </aside>
    </div>

    <section className={styles.panel}>
      <div className={styles.panelTitle}><div><p className="eyebrow">Controle pessoal</p><h2>Minhas fichas</h2></div><Badge>{data.total}</Badge></div>
      <form className={styles.filters}><input name="busca" defaultValue={busca} placeholder="Buscar cliente…"/><select name="status" defaultValue={status}>
        <option value="todos">Todos os status</option><option value="pendente">Pendentes</option><option value="entregue">Entregues</option><option value="cancelado">Canceladas</option><option value="atrasado">Atrasadas</option>
      </select><input type="hidden" name="period" value={period}/><button className="ui-button ui-button--secondary">Aplicar</button></form>
      {data.recent.length ? <div className={styles.tableWrap}><table><thead><tr><th>Cliente</th><th>Criação</th><th>Entrega</th><th>Peças</th><th>Status</th><th/></tr></thead><tbody>
        {data.recent.map((ficha)=><tr key={ficha.id}><td><strong>{ficha.cliente_nome_snapshot}</strong><small>{ficha.vendedor ?? "Sem vendedor"}</small></td><td>{date(ficha.created_at.slice(0,10))}</td><td>{date(ficha.data_entrega)}</td><td>{ficha.pieces}</td><td><Badge tone={ficha.status==="entregue"?"success":ficha.status==="cancelado"?"danger":"pending"}>{statusLabel(ficha.status)}</Badge></td><td><Link href={`/fichas/${ficha.id}`}>Abrir</Link></td></tr>)}
      </tbody></table></div> : <EmptyState title="Nenhuma ficha encontrada" description="Crie uma ficha ou ajuste os filtros."/>}
      <div className={styles.pagination}>{data.page>1&&<Link href={withParams(params,{page:String(data.page-1)})}>Anterior</Link>}<span>Página {data.page} de {Math.max(1,Math.ceil(data.total/data.pageSize))}</span>{data.page*data.pageSize<data.total&&<Link href={withParams(params,{page:String(data.page+1)})}>Próxima</Link>}</div>
    </section>
  </section>;
}

function Goal({label,current,target,projection}:{label:string;current:number;target:number;projection:number}) {
  const progress=target?Math.min(100,(current/target)*100):0;
  return <div><div className={styles.goalLabel}><span>{label}</span><strong>{current} / {target}</strong></div><progress max="100" value={progress}/><small>Projeção: {projection} no fim do mês</small></div>;
}
function Distribution({label,value,total}:{label:string;value:number;total:number}) { return <div><span>{label}</span><div><i style={{width:`${(value/total)*100}%`}}/></div><strong>{value}</strong></div>; }
function FichaLinks({rows}:{rows:Array<{id:string;cliente_nome_snapshot:string;data_entrega:string}>}) { return <ul className={styles.upcoming}>{rows.map((f)=><li key={f.id}><Link href={`/fichas/${f.id}`}><strong>{f.cliente_nome_snapshot}</strong><span>{date(f.data_entrega)}</span></Link></li>)}</ul>; }
function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function withParams(current:Params,updates:Record<string,string|null>){const p=new URLSearchParams();Object.entries(current).forEach(([k,v])=>{const x=first(v);if(x)p.set(k,x)});Object.entries(updates).forEach(([k,v])=>v===null?p.delete(k):p.set(k,v));return `/meu-painel?${p}`;}
function initials(name:string){return name.split(/\s+/).slice(0,2).map((p)=>p[0]).join("").toUpperCase();}
function number(value:number){return new Intl.NumberFormat("pt-BR").format(value);}
function date(value:string){return new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC"}).format(new Date(`${value}T12:00:00Z`));}
function statusLabel(status:"pendente"|"entregue"|"cancelado"){return {pendente:"Pendente",entregue:"Entregue",cancelado:"Cancelada"}[status];}
