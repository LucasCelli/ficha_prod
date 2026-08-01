import type { ReactNode } from "react";

export type ChartSeries = {
  label: string;
  points: Array<{ label: string; value: number }>;
};

type ChartFrameProps = {
  children: ReactNode;
  /** Titulo curto do grafico. Vira o `aria-label` e o caption da tabela alternativa. */
  title: string;
  /** Series exibidas. Geram a tabela alternativa lida por leitores de tela. */
  series: ChartSeries[];
  /** Rotulo da coluna de categoria, ex.: "Dia" ou "Vendedor". */
  categoryLabel?: string;
  className?: string;
  /** Legenda visual opcional, renderizada abaixo do grafico. */
  legend?: ReactNode;
  /** Formata valores na tabela alternativa. */
  formatValue?: (value: number) => string;
};

const defaultFormat = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

/**
 * Moldura padrao de grafico.
 *
 * O SVG e sempre `aria-hidden`; os dados chegam a tecnologias assistivas por uma
 * tabela real (visualmente oculta), e nao por hover ou por `aria-label` generico.
 */
export function ChartFrame({
  categoryLabel = "Categoria",
  children,
  className,
  formatValue = defaultFormat,
  legend,
  series,
  title,
}: ChartFrameProps) {
  const hasData = series.some((item) => item.points.length > 0);

  return (
    <figure className={["ui-chart-frame", className].filter(Boolean).join(" ")}>
      <div className="ui-chart-frame__canvas" aria-hidden="true">
        {children}
      </div>
      {legend ? <div className="ui-chart-frame__legend">{legend}</div> : null}
      {hasData ? (
        <ChartDataTable categoryLabel={categoryLabel} formatValue={formatValue} series={series} title={title} />
      ) : (
        <figcaption className="sr-only">{title}: sem dados no período.</figcaption>
      )}
    </figure>
  );
}

type ChartDataTableProps = {
  categoryLabel?: string;
  formatValue?: (value: number) => string;
  series: ChartSeries[];
  title: string;
};

/**
 * Tabela alternativa isolada, para graficos que ja possuem moldura propria.
 * O container visual do grafico deve receber `aria-hidden`.
 */
export function ChartDataTable({ categoryLabel = "Categoria", formatValue = defaultFormat, series, title }: ChartDataTableProps) {
  const categories = series[0]?.points.map((point) => point.label) ?? [];

  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">{categoryLabel}</th>
          {series.map((item) => (
            <th key={item.label} scope="col">
              {item.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {categories.map((category, index) => (
          <tr key={category}>
            <th scope="row">{category}</th>
            {series.map((item) => (
              <td key={item.label}>{formatValue(item.points[index]?.value ?? 0)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
