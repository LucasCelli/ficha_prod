"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RelatorioData, RelatorioRankItem } from "./data";
import { RelatorioMotionBlock } from "./relatorios-motion";

type ComparisonChartProps = {
  comparativo: RelatorioData["comparativo"];
};

type RankChartProps = {
  ariaLabel: string;
  items: RelatorioRankItem[];
  valueLabel: "fichas" | "itens";
  valueKey: "totalFichas" | "totalItens";
};

type AxisTickProps = {
  x?: number | string;
  y?: number | string;
  payload?: {
    value?: number | string;
  };
};

type BarLabelProps = {
  value?: unknown;
  width?: number | string;
  x?: number | string;
  y?: number | string;
};

const CHART_VISIBLE_LIMIT = 8;

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getComparisonFill(value: number) {
  if (value > 0) return "var(--color-success)";
  if (value < 0) return "var(--color-danger)";
  return "var(--color-muted)";
}

function truncateLabel(value: string) {
  return value.length > 22 ? `${value.slice(0, 20)}...` : value;
}

function getSignedValueLabel(value: number, suffix = "") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}${suffix}`;
}

function YAxisTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  const value = String(payload?.value ?? "");
  const tickX = Number(x);
  const tickY = Number(y);

  return (
    <text className="relatorios-chart__axis-label" dy={4} textAnchor="end" x={tickX - 8} y={tickY}>
      {truncateLabel(value)}
    </text>
  );
}

function ComparisonValueLabel({ value, x = 0, y = 0, width = 0 }: BarLabelProps) {
  if (typeof value !== "number") return <g />;

  const isNegative = value < 0;
  const labelX = Number(x) + (isNegative ? -8 : Number(width) + 8);

  return (
    <text className="relatorios-chart__value-label" dominantBaseline="middle" textAnchor={isNegative ? "end" : "start"} x={labelX} y={Number(y) + 10}>
      {getSignedValueLabel(value)}
    </text>
  );
}

function RankValueLabel({ value, x = 0, y = 0, width = 0 }: BarLabelProps) {
  if (typeof value !== "number") return <g />;

  return (
    <text className="relatorios-chart__value-label" dominantBaseline="middle" textAnchor="start" x={Number(x) + Number(width) + 8} y={Number(y) + 10}>
      {formatNumber(value)}
    </text>
  );
}

export function RelatorioComparisonChart({ comparativo }: ComparisonChartProps) {
  const data = [
    { label: "Fichas", suffix: "", value: comparativo.fichas },
    { label: "Itens", suffix: "", value: comparativo.itens },
    { label: "Clientes", suffix: "", value: comparativo.clientes },
    { label: "Entrega", suffix: "%", value: comparativo.taxaEntrega },
  ];

  return (
    <RelatorioMotionBlock className="relatorios-chart relatorios-chart--comparison" aria-label="Comparativo com periodo anterior">
      <ResponsiveContainer height={176} width="100%">
        <BarChart data={data} layout="vertical" margin={{ bottom: 0, left: 0, right: 72, top: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
          <XAxis axisLine={false} tickLine={false} type="number" />
          <YAxis axisLine={false} dataKey="label" tick={YAxisTick} tickLine={false} type="category" width={92} />
          <ReferenceLine stroke="var(--color-border)" x={0} />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }}
            formatter={(value, _name, item) => {
              const suffix = typeof item.payload?.suffix === "string" ? item.payload.suffix : "";
              return [getSignedValueLabel(Number(value), suffix), "Variacao"];
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            <LabelList content={ComparisonValueLabel} dataKey="value" />
            {data.map((item) => (
              <Cell fill={getComparisonFill(item.value)} key={item.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </RelatorioMotionBlock>
  );
}

export function RelatorioRankChart({ ariaLabel, items, valueKey, valueLabel }: RankChartProps) {
  const data = items.slice(0, CHART_VISIBLE_LIMIT).map((item) => ({
    label: item.label,
    value: item[valueKey],
  }));

  if (data.length === 0) {
    return null;
  }

  return (
    <RelatorioMotionBlock className="relatorios-chart relatorios-chart--rank" aria-label={ariaLabel}>
      <ResponsiveContainer height={Math.max(160, data.length * 32)} width="100%">
        <BarChart data={data} layout="vertical" margin={{ bottom: 0, left: 0, right: 52, top: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
          <XAxis axisLine={false} tickLine={false} type="number" />
          <YAxis axisLine={false} dataKey="label" tick={YAxisTick} tickLine={false} type="category" width={128} />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }}
            formatter={(value) => [`${formatNumber(Number(value))} ${valueLabel}`, valueLabel]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
          />
          <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 6, 6, 0]}>
            <LabelList content={RankValueLabel} dataKey="value" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </RelatorioMotionBlock>
  );
}
