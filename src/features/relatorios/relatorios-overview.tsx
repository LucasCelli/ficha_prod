import type { CSSProperties } from "react";
import Link from "next/link";
import { CalendarDays, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { formatDateInput } from "@/lib/dates";
import type { RelatorioData, RelatorioFilters, RelatorioRankItem, RelatorioResult, RelatorioVendedor } from "./data";
import { buildRelatorioSearchParams } from "./data";

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
          <Badge tone="info">Relatórios</Badge>
          <h1 id="relatorios-title" className="app-title">
            Relatórios e Estatísticas
          </h1>
        </div>
        <div className="relatorios-actions">
          <Link className="ui-button ui-button--secondary" href={`/fichas/pdf${suffix}`}>
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
        <SummaryCard label="Fichas Entregues" value={data.resumo.fichasEntregues} tone="success" />
        <SummaryCard label="Fichas Pendentes" value={data.resumo.fichasPendentes} tone="warning" />
        <SummaryCard label="Itens Confeccionados" value={data.resumo.itensConfeccionados} />
        <SummaryCard label="Novos Clientes" value={data.resumo.novosClientes} />
      </div>

      <div className="relatorios-panels">
        <section className="relatorios-panel" aria-labelledby="atividade-title">
          <PanelTitle id="atividade-title" title="Atividade de Criação de Fichas" />
          <ActivityHeatmap data={data.atividade} />
        </section>

        <section className="relatorios-panel" aria-labelledby="taxa-entrega-title">
          <PanelTitle id="taxa-entrega-title" title="Taxa de Entrega" />
          <div className="relatorios-rate">
            <strong>{formatNumber(data.resumo.taxaEntrega)}%</strong>
            <span>
              {formatNumber(data.resumo.fichasEntregues)} entregues de {formatNumber(data.resumo.totalFichas)} fichas no período
            </span>
          </div>
        </section>
      </div>

      <section className="relatorios-panel" aria-labelledby="comparativo-title">
        <PanelTitle id="comparativo-title" title="Comparativo com Período Anterior" />
        <div className="relatorios-comparison">
          <ComparisonItem label="Fichas" value={data.comparativo.fichas} />
          <ComparisonItem label="Itens" value={data.comparativo.itens} />
          <ComparisonItem label="Clientes" value={data.comparativo.clientes} />
          <ComparisonItem label="Taxa de entrega" suffix="%" value={data.comparativo.taxaEntrega} />
        </div>
      </section>

      <div className="relatorios-panels">
        <section className="relatorios-panel" aria-labelledby="top-vendedor-title">
          <PanelTitle id="top-vendedor-title" title="Top Vendedor" />
          <div className="relatorios-featured">
            <strong>{data.resumo.topVendedor ?? "Nenhum"}</strong>
            <span>{formatNumber(data.resumo.topVendedorTotal)} fichas no período</span>
          </div>
        </section>
      </div>

      <section className="relatorios-panel" aria-labelledby="vendedores-title">
        <PanelTitle id="vendedores-title" title="Resumo por Vendedor" />
        <VendedoresList vendedores={data.rankings.vendedores} />
      </section>

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

  return (
    <div className="relatorios-activity">
      <div className="relatorios-activity__grid" aria-label={`Atividade dos últimos 365 dias com ${formatNumber(total)} fichas`}>
        {data.map((day) => (
          <span
            aria-label={`${formatDate(day.date)}: ${formatNumber(day.count)} ficha(s)`}
            className={`relatorios-activity__cell relatorios-activity__cell--${day.level}`}
            key={day.date}
            title={`${formatDate(day.date)}: ${formatNumber(day.count)} ficha(s)`}
          />
        ))}
      </div>
      <p>{formatNumber(total)} fichas criadas nos últimos 365 dias.</p>
    </div>
  );
}

function ComparisonItem({ label, suffix = "", value }: { label: string; suffix?: string; value: number }) {
  const tone = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const sign = value > 0 ? "+" : "";

  return (
    <div className={`relatorios-comparison__item relatorios-comparison__item--${tone}`}>
      <span>{label}</span>
      <strong>
        {sign}
        {formatNumber(value)}
        {suffix}
      </strong>
    </div>
  );
}

function SummaryCard({ label, tone = "info", value }: { label: string; tone?: "info" | "success" | "warning"; value: number }) {
  return (
    <div className={`relatorios-summary__card relatorios-summary__card--${tone}`}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

function PanelTitle({ id, title }: { id: string; title: string }) {
  return <h2 id={id}>{title}</h2>;
}

function VendedoresList({ vendedores }: { vendedores: RelatorioVendedor[] }) {
  if (vendedores.length === 0) {
    return <p className="relatorios-muted">Nenhum vendedor encontrado no período.</p>;
  }

  return (
    <ol className="relatorios-rank-list">
      {vendedores.map((vendedor) => (
        <li key={vendedor.label}>
          <div className="relatorios-rank-list__header">
            <strong>{vendedor.label}</strong>
            <span>{formatNumber(vendedor.totalFichas)} fichas</span>
          </div>
          <span
            aria-label={`${vendedor.percent}% do maior volume de fichas por vendedor`}
            className="relatorios-rank-bar"
            style={{ "--bar-size": `${vendedor.percent}%` } as CSSProperties}
          />
          <p>
            {formatNumber(vendedor.totalItens)} itens · {formatNumber(vendedor.entregues)} entregues · {formatNumber(vendedor.pendentes)} pendentes
          </p>
        </li>
      ))}
    </ol>
  );
}

function RankPanel({ id, items, title }: { id: string; items: RelatorioRankItem[]; title: string }) {
  return (
    <section className="relatorios-panel" aria-labelledby={id}>
      <PanelTitle id={id} title={title} />
      {items.length === 0 ? (
        <p className="relatorios-muted">Nenhum dado encontrado no período.</p>
      ) : (
        <ol className="relatorios-rank-list">
          {items.map((item) => (
            <li key={item.label}>
              <div className="relatorios-rank-list__header">
                <strong>{item.label}</strong>
                <span>{formatNumber(item.totalItens)} itens</span>
              </div>
              <span
                aria-label={`${item.percent}% do maior volume do ranking`}
                className="relatorios-rank-bar"
                style={{ "--bar-size": `${item.percent}%` } as CSSProperties}
              />
              <p>{formatNumber(item.totalFichas)} fichas</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(value: string) {
  return formatDateInput(value);
}
