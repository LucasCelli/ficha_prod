import type { ReactNode } from "react";
import Link from "next/link";
import {
  Boxes,
  CalendarDays,
  CalendarRange,
  Clock,
  FileSpreadsheet,
  FileText,
  Layers,
  Minus,
  Package,
  PieChart,
  Ruler,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import type { RelatorioData, RelatorioFilters, RelatorioRankItem, RelatorioResult } from "./data";
import { buildRelatorioSearchParams } from "./data";
import {
  RelatorioCategoryDonut,
  RelatorioRankBars,
  RelatorioStatusDonut,
  RelatorioTrendChart,
  RelatorioVendedoresChart,
} from "./relatorios-charts";
import { RelatorioMotionBlock, RelatorioMotionSection } from "./relatorios-motion";

type RelatoriosOverviewProps = {
  filters: RelatorioFilters;
  result: RelatorioResult;
};

type Trend = {
  text: string;
  tone: "down" | "neutral" | "up";
};

const periodOptions = [
  { label: "Este Mês", value: "mes" },
  { label: "Último Mês", value: "ultimo_mes" },
  { label: "Este Ano", value: "ano" },
  { label: "Personalizado", value: "customizado" },
] as const;

const granularidadeLabels = {
  dia: "por dia",
  mes: "por mês",
  semana: "por semana",
} as const;

export function RelatoriosOverview({ filters, result }: RelatoriosOverviewProps) {
  if (result.kind === "not-configured") {
    return (
      <section className="relatorios-view" aria-labelledby="relatorios-title">
        <RelatoriosHeader filters={filters} />
        <EmptyState title="Relatórios indisponíveis" description="Tente novamente." />
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
    <form className="relatorios-toolbar" action="/relatorios">
      <div className="relatorios-toolbar__row">
        <div className="field field--grow">
          <span className="field__label">Período do relatório</span>
          <div className="relatorios-segmented" role="group" aria-label="Período do relatório">
            {periodOptions
              .filter((option) => option.value !== "customizado")
              .map((option) => (
                <button
                  aria-pressed={filters.periodo === option.value ? "true" : "false"}
                  className={`relatorios-segmented__option${filters.periodo === option.value ? " is-active" : ""}`}
                  key={option.value}
                  name="periodo"
                  type="submit"
                  value={option.value}
                >
                  {option.label}
                </button>
              ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
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
        <Button name="periodo" type="submit" value={filters.periodo}>
          <Search aria-hidden="true" size={18} />
          Aplicar
        </Button>
      </div>

      <div className="relatorios-toolbar__row relatorios-toolbar__row--custom">
        <span className="relatorios-toolbar__hint">Intervalo personalizado</span>
        <div className="field">
          <label htmlFor="dataInicio">Data inicial</label>
          <input id="dataInicio" name="dataInicio" defaultValue={filters.dataInicio} type="date" />
        </div>
        <div className="field">
          <label htmlFor="dataFim">Data final</label>
          <input id="dataFim" name="dataFim" defaultValue={filters.dataFim} type="date" />
        </div>
        <Button
          className={filters.periodo === "customizado" ? "is-active" : undefined}
          name="periodo"
          type="submit"
          value="customizado"
          variant="secondary"
        >
          <CalendarRange aria-hidden="true" size={18} />
          Aplicar intervalo
        </Button>
      </div>
    </form>
  );
}

function RelatoriosContent({ data }: { data: RelatorioData }) {
  const { comparativoAnterior: anterior, comparativoAtual: atual, resumo } = data;
  const totalEventos = data.eventos.eventos + data.eventos.avulsos;

  return (
    <div className="relatorios-results">
      <div className="relatorios-period-label">
        <CalendarDays aria-hidden="true" size={18} />
        <span>{data.periodoLabel}</span>
      </div>

      <div className="relatorios-kpis" aria-label="Indicadores principais">
        <KpiCard
          delay={0}
          label="Fichas criadas"
          value={formatNumber(resumo.totalFichas)}
          trend={getRatioTrend(atual.fichas, anterior.fichas)}
          hint="vs. período anterior"
        />
        <KpiCard
          delay={0.04}
          label="Itens produzidos"
          value={formatNumber(resumo.totalItens)}
          trend={getRatioTrend(atual.itens, anterior.itens)}
          hint="vs. período anterior"
        />
        <KpiCard
          delay={0.08}
          label="Taxa de entrega"
          value={`${formatNumber(resumo.taxaEntrega)}%`}
          trend={getPointTrend(atual.taxaEntrega, anterior.taxaEntrega)}
          hint="entregues / (entregues + pendentes)"
        />
        <KpiCard
          delay={0.12}
          label="Novos clientes"
          value={formatNumber(resumo.novosClientes)}
          trend={getRatioTrend(atual.clientes, anterior.clientes)}
          hint="vs. período anterior"
        />
        <KpiCard
          delay={0.16}
          label="Prazo médio de entrega"
          value={resumo.prazoMedioEntrega === null ? "—" : `${formatDecimal(resumo.prazoMedioEntrega)} d`}
          hint="da criação à entrega"
        />
        <KpiCard
          delay={0.2}
          label="Itens por ficha"
          value={formatDecimal(resumo.itensPorFicha)}
          hint="média de peças por pedido"
        />
      </div>

      <RelatorioMotionSection className="relatorios-panel relatorios-panel--wide" aria-labelledby="tendencia-title">
        <PanelTitle icon={<TrendingUp aria-hidden="true" size={18} />} id="tendencia-title" title="Produção ao longo do período" subtitle={`Fichas, entregas e itens ${granularidadeLabels[data.granularidade]}`} />
        <RelatorioTrendChart data={data.tendencia} />
      </RelatorioMotionSection>

      <div className="relatorios-panels">
        <RelatorioMotionSection className="relatorios-panel" aria-labelledby="status-title">
          <PanelTitle icon={<PieChart aria-hidden="true" size={18} />} id="status-title" title="Distribuição por status" />
          <RelatorioStatusDonut data={data.statusDistribuicao} />
          <EventosResumo avulsos={data.eventos.avulsos} eventos={data.eventos.eventos} total={totalEventos} />
        </RelatorioMotionSection>

        <RelatorioMotionSection className="relatorios-panel" aria-labelledby="personalizacao-title" delay={0.06}>
          <PanelTitle icon={<Sparkles aria-hidden="true" size={18} />} id="personalizacao-title" title="Personalizações" subtitle="Participação por itens" />
          <RelatorioCategoryDonut ariaLabel="Personalizações por itens" items={data.personalizacoes} valueLabel="itens" />
        </RelatorioMotionSection>
      </div>

      <RelatorioMotionSection className="relatorios-panel relatorios-panel--wide" aria-labelledby="vendedores-title">
        <PanelTitle icon={<Users aria-hidden="true" size={18} />} id="vendedores-title" title="Desempenho por vendedor" subtitle="Fichas entregues e pendentes" />
        <RelatorioVendedoresChart items={data.rankings.vendedores} />
      </RelatorioMotionSection>

      <div className="relatorios-panels">
        <RankPanel icon={<Layers aria-hidden="true" size={18} />} id="materiais-title" items={data.rankings.materiais} title="Materiais mais usados" />
        <RankPanel icon={<Package aria-hidden="true" size={18} />} id="produtos-title" items={data.rankings.produtos} title="Top produtos" />
      </div>

      <div className="relatorios-panels">
        <RankPanel icon={<Boxes aria-hidden="true" size={18} />} id="clientes-title" items={data.rankings.clientes} title="Top clientes" />
        <RankPanel icon={<Ruler aria-hidden="true" size={18} />} id="tamanhos-title" items={data.rankings.tamanhos} title="Distribuição por tamanho" />
      </div>
    </div>
  );
}

function EventosResumo({ avulsos, eventos, total }: { avulsos: number; eventos: number; total: number }) {
  if (total === 0) {
    return null;
  }

  const percentEventos = Math.round((eventos / total) * 100);

  return (
    <div className="relatorios-eventos">
      <Clock aria-hidden="true" size={16} />
      <span>
        <strong>{formatNumber(eventos)}</strong> de evento ({percentEventos}%) e <strong>{formatNumber(avulsos)}</strong> avulsas
      </span>
    </div>
  );
}

function KpiCard({ delay, hint, label, trend, value }: { delay: number; hint?: string; label: string; trend?: Trend; value: string }) {
  return (
    <RelatorioMotionBlock className="relatorios-kpi" delay={delay}>
      <span className="relatorios-kpi__label">{label}</span>
      <div className="relatorios-kpi__value-row">
        <strong className="relatorios-kpi__value">{value}</strong>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      {hint ? <span className="relatorios-kpi__hint">{hint}</span> : null}
    </RelatorioMotionBlock>
  );
}

function TrendBadge({ trend }: { trend: Trend }) {
  const Icon = trend.tone === "up" ? TrendingUp : trend.tone === "down" ? TrendingDown : Minus;

  return (
    <span className={`relatorios-kpi__trend relatorios-kpi__trend--${trend.tone}`}>
      <Icon aria-hidden="true" size={14} />
      {trend.text}
    </span>
  );
}

function PanelTitle({ icon, id, subtitle, title }: { icon?: ReactNode; id: string; subtitle?: string; title: string }) {
  return (
    <div className="relatorios-panel__head">
      <h2 id={id}>
        {icon ? <span className="relatorios-panel__icon">{icon}</span> : null}
        {title}
      </h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

function RankPanel({ icon, id, items, title }: { icon?: ReactNode; id: string; items: RelatorioRankItem[]; title: string }) {
  return (
    <RelatorioMotionSection className="relatorios-panel" aria-labelledby={id}>
      <PanelTitle icon={icon} id={id} title={title} />
      <RelatorioRankBars items={items} valueLabel="itens" />
    </RelatorioMotionSection>
  );
}

function getRatioTrend(atual: number, anterior: number): Trend {
  const diff = atual - anterior;

  if (diff === 0) {
    return { text: "0%", tone: "neutral" };
  }

  if (anterior <= 0) {
    return { text: `${diff > 0 ? "+" : ""}${formatNumber(diff)}`, tone: diff > 0 ? "up" : "down" };
  }

  const percent = Math.round((diff / anterior) * 100);
  return { text: `${percent > 0 ? "+" : ""}${percent}%`, tone: diff > 0 ? "up" : "down" };
}

function getPointTrend(atual: number, anterior: number): Trend {
  const diff = atual - anterior;

  if (diff === 0) {
    return { text: "0 pp", tone: "neutral" };
  }

  return { text: `${diff > 0 ? "+" : ""}${formatNumber(diff)} pp`, tone: diff > 0 ? "up" : "down" };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}
