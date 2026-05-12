import type { CSSProperties } from "react";
import Link from "next/link";
import { CalendarDays, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Button, EmptyState, Tooltip } from "@/components/ui";
import { formatDateInput } from "@/lib/dates";
import type { RelatorioData, RelatorioFilters, RelatorioRankItem, RelatorioResult } from "./data";
import { buildRelatorioSearchParams } from "./data";
import { RelatorioComparisonChart, RelatorioRankChart } from "./relatorios-charts";
import { RelatorioMotionBlock, RelatorioMotionSection } from "./relatorios-motion";

type RelatoriosOverviewProps = {
  filters: RelatorioFilters;
  result: RelatorioResult;
};

const periodOptions = [
  { label: "Este Mês", value: "mes" },
  { label: "Último Mês", value: "ultimo_mes" },
  { label: "Este Ano", value: "ano" },
  { label: "Personalizado", value: "customizado" },
] as const;

export function RelatoriosOverview({ filters, result }: RelatoriosOverviewProps) {
  if (result.kind === "not-configured") {
    return (
      <section className="relatorios-view" aria-labelledby="relatorios-title">
        <RelatoriosHeader filters={filters} />
        <EmptyState
          title="Relatórios indisponíveis"
          description="Tente novamente."
        />
      </section>
    );
  }

  if (result.kind === "error") {
    return (
      <section className="relatorios-view" aria-labelledby="relatorios-title">
        <RelatoriosHeader filters={filters} />
        <EmptyState title="Não foi possível carregar o relatório" description={result.message} />
      </section>
    );
  }

  return (
    <section className="relatorios-view" aria-labelledby="relatorios-title">
      <RelatoriosHeader filters={result.data.filtros} />
      <PeriodForm filters={result.data.filtros} />
      <RelatoriosContent data={result.data} />
    </section>
  );
}

function RelatoriosHeader({ filters }: { filters: RelatorioFilters }) {
  const params = buildRelatorioSearchParams(filters).toString();
  const suffix = params ? `?${params}` : "";

  return (
    <header className="relatorios-view__header">
      <div className="page-heading">
        <div className="page-heading__copy">
          <p className="eyebrow">Relatórios</p>
          <h1 id="relatorios-title" className="app-title">
            Relatórios
          </h1>
        </div>
        <div className="relatorios-actions">
          <Link className="ui-button ui-button--secondary" href={`/relatorios/pdf${suffix}`}>
            <FileText aria-hidden="true" size={18} />
            Exportar PDF
          </Link>
          <Link className="ui-button ui-button--primary" href={`/relatorios/excel${suffix}`}>
            <FileSpreadsheet aria-hidden="true" size={18} />
            Exportar Excel
          </Link>
        </div>
      </div>
    </header>
  );
}

function PeriodForm({ filters }: { filters: RelatorioFilters }) {
  return (
    <form className="relatorios-toolbar relatorios-toolbar--periodo" action="/relatorios">
      <div className="field">
        <label htmlFor="periodo">Período do relatório</label>
        <select id="periodo" name="periodo" defaultValue={filters.periodo}>
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="dataInicio">Data inicial</label>
        <input id="dataInicio" name="dataInicio" defaultValue={filters.dataInicio} type="date" />
      </div>
      <div className="field">
        <label htmlFor="dataFim">Data final</label>
        <input id="dataFim" name="dataFim" defaultValue={filters.dataFim} type="date" />
      </div>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={filters.status ?? ""}>
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="entregue">Entregue</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="evento">Evento</label>
        <select id="evento" name="evento" defaultValue={typeof filters.evento === "boolean" ? String(filters.evento) : ""}>
          <option value="">Todos</option>
          <option value="true">Somente eventos</option>
          <option value="false">Sem evento</option>
        </select>
      </div>
      <Button type="submit">
        <Search aria-hidden="true" size={18} />
        Aplicar filtros
      </Button>
    </form>
  );
}

function RelatoriosContent({ data }: { data: RelatorioData }) {
  return (
    <div className="relatorios-results">
      <div className="relatorios-period-label">
        <CalendarDays aria-hidden="true" size={18} />
        <span>{data.periodoLabel}</span>
      </div>

      <div className="relatorios-summary" aria-label="Estatísticas principais">
        <SummaryCard delay={0} label="Fichas Entregues" value={data.resumo.fichasEntregues} tone="success" />
        <SummaryCard delay={0.04} label="Fichas Pendentes" value={data.resumo.fichasPendentes} tone="warning" />
        <SummaryCard delay={0.08} label="Itens Confeccionados" value={data.resumo.itensConfeccionados} />
        <SummaryCard delay={0.12} label="Novos Clientes" value={data.resumo.novosClientes} />
      </div>

      <div className="relatorios-panels">
        <RelatorioMotionSection className="relatorios-panel" aria-labelledby="atividade-title">
          <PanelTitle id="atividade-title" title="Atividade de Criação de Fichas" />
          <ActivityHeatmap data={data.atividade} />
        </RelatorioMotionSection>

        <RelatorioMotionSection className="relatorios-panel" aria-labelledby="taxa-entrega-title" delay={0.06}>
          <PanelTitle id="taxa-entrega-title" title="Entrega" />
          <div className="relatorios-context">
            <DeliveryRateSummary data={data} />
          </div>
        </RelatorioMotionSection>
      </div>

      <RelatorioMotionSection className="relatorios-panel" aria-labelledby="comparativo-title">
        <PanelTitle id="comparativo-title" title="Comparativo com Período Anterior" />
        <RelatorioComparisonChart comparativo={data.comparativo} />
      </RelatorioMotionSection>

      <RelatorioMotionSection className="relatorios-panel relatorios-panel--wide" aria-labelledby="vendedores-title">
        <PanelTitle id="vendedores-title" title="Resumo por Vendedor" />
        <RankChartOrEmpty
          ariaLabel="Volume de fichas por vendedor"
          emptyText="Nenhum vendedor encontrado no período."
          items={data.rankings.vendedores}
          valueKey="totalFichas"
          valueLabel="fichas"
        />
      </RelatorioMotionSection>

      <div className="relatorios-panels">
        <RankPanel id="materiais-title" items={data.rankings.materiais} title="Análise por Material" />
        <RankPanel id="produtos-title" items={data.rankings.produtos} title="Top Produtos" />
      </div>

      <div className="relatorios-panels">
        <RankPanel id="clientes-title" items={data.rankings.clientes} title="Top Clientes" />
        <RankPanel id="tamanhos-title" items={data.rankings.tamanhos} title="Distribuição por Tamanho" />
      </div>

      <RankPanel id="personalizacao-title" items={data.personalizacoes} title="Personalizações" />
    </div>
  );
}

function ActivityHeatmap({ data }: { data: RelatorioData["atividade"] }) {
  const total = data.reduce((sum, day) => sum + day.count, 0);
  const leadingCells = data[0] ? getBusinessWeekdayIndex(data[0].date) : 0;
  const columns = Math.max(1, Math.ceil((leadingCells + data.length) / 5));
  const monthLabels = getActivityMonthLabels(data, leadingCells);

  return (
    <div className="relatorios-activity">
      <div className="relatorios-activity__months" style={{ "--activity-columns": columns } as CSSProperties} aria-hidden="true">
        {monthLabels.map((month) => (
          <span key={`${month.label}-${month.column}`} style={{ gridColumn: `${month.column} / span 4` }}>
            {month.label}
          </span>
        ))}
      </div>
      <div className="relatorios-activity__body">
        <div className="relatorios-activity__weekdays" aria-hidden="true">
          <span>Seg</span>
          <span>Qua</span>
          <span>Sex</span>
        </div>
        <div
          className="relatorios-activity__grid"
          style={{ "--activity-columns": columns } as CSSProperties}
          aria-label={`Atividade dos últimos 365 dias úteis com ${formatNumber(total)} fichas`}
        >
          {Array.from({ length: leadingCells }).map((_, index) => (
            <span aria-hidden="true" className="relatorios-activity__cell relatorios-activity__cell--empty" key={`empty-${index}`} />
          ))}
          {data.map((day) => (
            <Tooltip label={`${formatDate(day.date)}: ${formatNumber(day.count)} ficha(s)`} key={day.date}>
              <span
                aria-label={`${formatDate(day.date)}: ${formatNumber(day.count)} ficha(s)`}
                className={`relatorios-activity__cell relatorios-activity__cell--${day.level}`}
                tabIndex={0}
              />
            </Tooltip>
          ))}
        </div>
      </div>
      <p>{formatNumber(total)} fichas criadas nos últimos 365 dias úteis.</p>
    </div>
  );
}

function DeliveryRateSummary({ data }: { data: RelatorioData }) {
  const taxaEntrega = data.resumo.taxaEntrega;
  const style = {
    "--delivery-angle": `${Math.max(0, Math.min(taxaEntrega, 100)) * 3.6}deg`,
    "--delivery-color": getDeliveryColor(taxaEntrega),
  } as CSSProperties;

  return (
    <div className="relatorios-delivery">
      <div
        aria-label={`${formatNumber(taxaEntrega)}% de taxa de entrega`}
        className="relatorios-delivery__meter"
        style={style}
      >
        <span>{formatNumber(taxaEntrega)}%</span>
      </div>
      <div className="relatorios-delivery__copy">
        <div>
          <strong>{formatNumber(data.resumo.fichasEntregues)}</strong>
          <span>entregues no período</span>
        </div>
        <dl>
          <div>
            <dt>Recorte anterior</dt>
            <dd>{formatNumber(data.resumo.entregasRecorteAnterior)}</dd>
          </div>
          <div>
            <dt>Recorte anual</dt>
            <dd>{formatNumber(data.resumo.entregasAnoAtual)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function SummaryCard({
  delay,
  label,
  tone = "info",
  value,
}: {
  delay: number;
  label: string;
  tone?: "info" | "success" | "warning";
  value: number;
}) {
  return (
    <RelatorioMotionBlock className={`relatorios-summary__card relatorios-summary__card--${tone}`} delay={delay}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </RelatorioMotionBlock>
  );
}

function PanelTitle({ id, title }: { id: string; title: string }) {
  return <h2 id={id}>{title}</h2>;
}

function RankPanel({ id, items, title }: { id: string; items: RelatorioRankItem[]; title: string }) {
  return (
    <RelatorioMotionSection className="relatorios-panel" aria-labelledby={id}>
      <PanelTitle id={id} title={title} />
      <RankChartOrEmpty ariaLabel={title} emptyText="Nenhum dado encontrado no período." items={items} valueKey="totalItens" valueLabel="itens" />
    </RelatorioMotionSection>
  );
}

function RankChartOrEmpty({
  ariaLabel,
  emptyText,
  items,
  valueKey,
  valueLabel,
}: {
  ariaLabel: string;
  emptyText: string;
  items: RelatorioRankItem[];
  valueKey: "totalFichas" | "totalItens";
  valueLabel: "fichas" | "itens";
}) {
  if (items.length === 0) {
    return <p className="relatorios-muted">{emptyText}</p>;
  }

  return <RelatorioRankChart ariaLabel={ariaLabel} items={items} valueKey={valueKey} valueLabel={valueLabel} />;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(value: string) {
  return formatDateInput(value);
}

function getBusinessWeekdayIndex(value: string) {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return Math.max(0, Math.min((day + 6) % 7, 4));
}

function getActivityMonthLabels(data: RelatorioData["atividade"], leadingCells: number) {
  let currentMonth = "";

  return data.reduce<Array<{ column: number; label: string }>>((labels, day, index) => {
    const month = day.date.slice(0, 7);

    if (month === currentMonth) {
      return labels;
    }

    currentMonth = month;
    labels.push({
      column: Math.floor((leadingCells + index) / 5) + 1,
      label: formatMonth(day.date),
    });
    return labels;
  }, []);
}

function formatMonth(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date).replace(".", "");
}

function getDeliveryColor(value: number) {
  if (value >= 90) return "#237804";
  if (value >= 70) return "#d4a106";
  if (value >= 40) return "#d46b08";
  return "#cf1322";
}
