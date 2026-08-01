import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock3, FilePlus2, FileText, Package } from "lucide-react";
import { Badge, DataTable, EmptyState } from "@/components/ui";
import { requireAppSession } from "@/features/auth/session";
import { FichaRowActions } from "@/features/fichas/ficha-row-actions";
import { FichaRowThumbnail } from "@/features/fichas/ficha-row-thumbnail";
import { getPersonalDashboardData } from "@/features/meu-painel/data";
import { PersonalProductivityChart, PersonalStatusChart } from "@/features/meu-painel/personal-charts";
import { formatBusinessDateTime, formatShortDateInput, getBusinessTodayInput } from "@/lib/dates";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import styles from "./profile.module.css";
import visual from "./visual.module.css";

export const metadata: Metadata = {
  title: "Meu perfil | Fichas Técnicas",
};

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
  const today = getBusinessTodayInput();
  const metrics = [
    ["Fichas", data.metrics.fichas, FileText], ["Peças", data.metrics.pieces, Package],
    ["Pendentes", data.metrics.pendentes, Clock3], ["Entregues", data.metrics.entregues, CheckCircle2],
    ["Atrasadas", data.metrics.atrasadas, CalendarClock],
  ] as const;

  return <section className={`${styles.page} ${visual.visual}`} aria-labelledby="personal-title">
    <header className={styles.hero}>
      <div className={styles.identity}><span className={styles.avatar}>{initials(data.user.displayName)}</span><div>
        <p className="eyebrow">Meu perfil</p><h1 id="personal-title">{data.user.displayName}</h1>
        <div className={styles.userMeta}>
          <Badge tone="neutral">@{data.user.username}</Badge>
          <Badge tone="info">{data.user.role === "superadmin" ? "Superadministrador" : "Operador"}</Badge>
          <small>Último acesso: {data.lastLoginAt ? formatBusinessDateTime(new Date(data.lastLoginAt)) : "primeiro acesso"}</small>
        </div>
      </div></div>
      <Link className="ui-button ui-button--primary" href="/fichas/nova"><FilePlus2 size={17}/> Nova ficha</Link>
    </header>

    <div className={styles.periodFilter}>
      <span>Período</span><nav className={styles.periods} aria-label="Período das estatísticas">
      {[["mes","Mês atual"],["7","7 dias"],["90","90 dias"],["total","Total"]].map(([value,label]) =>
        <Link className={period === value ? styles.activePeriod : ""} href={withParams(params,{period:value,page:null})} key={value}>{label}</Link>)}
      </nav>
    </div>
    <div className={styles.metrics}>{metrics.map(([label,value,Icon],index) =>
      <article className={`${styles.metric} ${visual.metric}`} key={label} style={{"--metric-accent":["var(--color-info)","var(--color-primary)","var(--color-pending)","var(--color-success)","var(--color-danger)"][index]} as CSSProperties}><span className={visual.metricIcon}><Icon size={20}/></span><span>{label}</span><strong>{number(value)}</strong></article>)}</div>

    <div className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><div><p className="eyebrow">Produtividade</p><h2>Evolução no período</h2></div>
          <Badge tone={data.comparison !== null && data.comparison >= 0 ? "success" : "danger"}>{data.comparison === null ? "Sem comparação" : `${data.comparison >= 0 ? "+" : ""}${data.comparison.toFixed(0)}%`}</Badge></div>
        <PersonalProductivityChart data={data.series} />
        <div className={styles.insights}><span><strong>{data.metrics.noPrazo}</strong> entregas no prazo</span><span><strong>{data.averageLeadDays === null ? "—" : data.averageLeadDays.toFixed(1)}</strong> dias médios</span><span><strong>{data.allTimeTotal}</strong> fichas no histórico</span></div>
        <h3 className={styles.subheading}>Distribuição por status</h3>
        <PersonalStatusChart data={[
          { label: "Pendentes", value: data.metrics.pendentes, color: "var(--color-pending-chart)" },
          { label: "Entregues", value: data.metrics.entregues, color: "var(--color-success)" },
        ]}/>
      </section>
      <aside className={styles.panel}>
        <h3 className={styles.subheading}>Próximas entregas</h3><FichaLinks rows={data.upcoming}/>
        {data.idle.length > 0 && <><h3 className={styles.subheading}>Sem movimentação há 7 dias</h3><FichaLinks rows={data.idle}/></>}
      </aside>
    </div>

    <section className={styles.panel}>
      <div className={styles.panelTitle}><div><p className="eyebrow">Controle pessoal</p><h2>Minhas fichas</h2></div><Badge>{data.total}</Badge></div>
      <form className={styles.filters}><label className="sr-only" htmlFor="painel-busca">Buscar cliente</label><input id="painel-busca" name="busca" defaultValue={busca} placeholder="Buscar cliente…"/><label className="sr-only" htmlFor="painel-status">Filtrar por status</label><select id="painel-status" name="status" defaultValue={status}>
        <option value="todos">Todos os status</option><option value="pendente">Pendentes</option><option value="entregue">Entregues</option><option value="atrasado">Atrasadas</option>
      </select><input type="hidden" name="period" value={period}/><button className="ui-button ui-button--secondary">Aplicar</button></form>
      {data.recent.length ? <div className="fichas-list-container"><DataTable caption="Minhas fichas" columns={personalColumns}>
        {data.recent.map((ficha)=>{const overdue=ficha.status==="pendente"&&ficha.data_entrega<today;const previewHref=`/fichas/${ficha.id}`;return <tr key={ficha.id}>
          <td><div className="ficha-row__client"><FichaRowThumbnail alt={ficha.cliente_nome_snapshot} imageUrl={ficha.imageUrl}/><span className="ui-table__primary">
            <Link className="ui-table__link" href={previewHref}>{ficha.cliente_nome_snapshot}</Link><span className="ficha-row__meta">
              <Badge className="ficha-row__meta-badge" tone="neutral">{ficha.pieces} {ficha.pieces===1?"peça":"peças"}</Badge>
              <Badge className="ficha-row__meta-badge" tone="neutral">{ficha.numero_venda?`Venda ${ficha.numero_venda}`:"Sem venda"}</Badge>
            </span></span></div></td>
          <td><span className="ui-table__primary"><span>{date(ficha.data_entrega)}</span><small>{date(ficha.created_at.slice(0,10))} criação</small></span></td>
          <td><Badge tone={overdue?"danger":ficha.status==="entregue"?"success":"pending"}>{overdue?"Atrasada":statusLabel(ficha.status)}</Badge></td>
          <td><span className="ui-table__primary"><strong>{normalizePersonalizacaoLabel(ficha.arte)}</strong><small>{ficha.vendedor??"Sem vendedor"}</small></span></td>
          <td><FichaRowActions fichaId={ficha.id} fichaLabel={ficha.cliente_nome_snapshot} canOrganizeNameList={false} fullDeliverButton={overdue} hasOrganizedNameList={false} hasRawNameList={false} printHref={`/fichas/${ficha.id}/imprimir`} previewHref={previewHref} returnTo="/meu-painel" status={ficha.status}/></td>
        </tr>})}
      </DataTable></div> : <EmptyState title="Nenhuma ficha encontrada" description="Crie uma ficha ou ajuste os filtros."/>}
      <div className={styles.pagination}>{data.page>1&&<Link href={withParams(params,{page:String(data.page-1)})}>Anterior</Link>}<span>Página {data.page} de {Math.max(1,Math.ceil(data.total/data.pageSize))}</span>{data.page*data.pageSize<data.total&&<Link href={withParams(params,{page:String(data.page+1)})}>Próxima</Link>}</div>
    </section>
  </section>;
}

const personalColumns = [
  { key:"ficha", label:"Ficha", width:"35%" },
  { key:"datas", label:"Entrega", width:"17%" },
  { key:"status", label:"Status", width:"13%" },
  { key:"detalhes", label:"Detalhes", width:"18%" },
  { key:"acoes", label:"Ações", width:"220px" },
];
function FichaLinks({rows}:{rows:Array<{id:string;cliente_nome_snapshot:string;data_entrega:string}>}) { return <ul className={styles.upcoming}>{rows.map((f)=><li key={f.id}><Link href={`/fichas/${f.id}`}><strong>{f.cliente_nome_snapshot}</strong><span>{date(f.data_entrega)}</span></Link></li>)}</ul>; }
function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function withParams(current:Params,updates:Record<string,string|null>){const p=new URLSearchParams();Object.entries(current).forEach(([k,v])=>{const x=first(v);if(x)p.set(k,x)});Object.entries(updates).forEach(([k,v])=>v===null?p.delete(k):p.set(k,v));return `/meu-painel?${p}`;}
function initials(name:string){return name.split(/\s+/).slice(0,2).map((p)=>p[0]).join("").toUpperCase();}
function number(value:number){return new Intl.NumberFormat("pt-BR").format(value);}
function date(value:string){return formatShortDateInput(value);}
function statusLabel(status:"pendente"|"entregue"){return {pendente:"Pendente",entregue:"Entregue"}[status];}
