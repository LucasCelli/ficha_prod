"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RelatorioRankItem, RelatorioStatusFatia, RelatorioTrendPoint, RelatorioVendedor } from "./data";
import { RelatorioMotionBlock } from "./relatorios-motion";

type AxisTickProps = {
  x?: number | string;
  y?: number | string;
  payload?: {
    value?: number | string;
  };
};

type DonutSlice = {
  color: string;
  key: string;
  label: string;
  value: number;
};

const CHART_VISIBLE_LIMIT = 8;

const CATEGORY_COLORS = [
  "var(--color-primary)",
  "var(--color-info)",
  "var(--color-warning)",
  "#9254de",
  "var(--color-success)",
  "#eb2f96",
  "#13c2c2",
  "var(--color-danger)",
];

const STATUS_COLORS: Record<RelatorioStatusFatia["status"], string> = {
  cancelado: "var(--color-danger)",
  entregue: "var(--color-success)",
  pendente: "var(--color-pending-chart)",
};

const TOOLTIP_CURSOR = { fill: "color-mix(in srgb, var(--color-primary) 8%, transparent)" };

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function truncateLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 16)}...` : value;
}

function YAxisTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  const value = String(payload?.value ?? "");

  return (
    <text className="relatorios-chart__axis-label" dy={4} textAnchor="end" x={Number(x) - 8} y={Number(y)}>
      {truncateLabel(value)}
    </text>
  );
}

export function RelatorioTrendChart({ data }: { data: RelatorioTrendPoint[] }) {
  if (data.length === 0) {
    return <p className="relatorios-muted">Sem dados de produção no período.</p>;
  }

  return (
    <RelatorioMotionBlock className="relatorios-chart relatorios-chart--trend" aria-label="Tendência de produção no período">
      <ResponsiveContainer height={260} width="100%">
        <ComposedChart data={data} margin={{ bottom: 0, left: -12, right: -8, top: 8 }}>
          <defs>
            <linearGradient id="relatorios-trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={16} tickLine={false} tickMargin={8} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={40} yAxisId="left" />
          <YAxis allowDecimals={false} axisLine={false} orientation="right" tickLine={false} width={44} yAxisId="right" />
          <Tooltip cursor={TOOLTIP_CURSOR} formatter={(value, name) => [formatNumber(Number(value)), String(name)]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: "0.78rem", paddingTop: 8 }} />
          <Area
            dataKey="criadas"
            fill="url(#relatorios-trend-fill)"
            name="Fichas criadas"
            stroke="var(--color-primary)"
            strokeWidth={2.4}
            type="monotone"
            yAxisId="left"
          />
          <Line dataKey="entregues" dot={false} name="Entregues" stroke="var(--color-success)" strokeWidth={2.4} type="monotone" yAxisId="left" />
          <Line
            dataKey="itens"
            dot={false}
            name="Itens (eixo dir.)"
            stroke="var(--color-info)"
            strokeDasharray="5 4"
            strokeWidth={2}
            type="monotone"
            yAxisId="right"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </RelatorioMotionBlock>
  );
}

export function RelatorioStatusDonut({ data }: { data: RelatorioStatusFatia[] }) {
  if (data.length === 0) {
    return <p className="relatorios-muted">Nenhuma ficha no período.</p>;
  }

  const slices: DonutSlice[] = data.map((fatia) => ({
    color: STATUS_COLORS[fatia.status],
    key: fatia.status,
    label: fatia.label,
    value: fatia.value,
  }));

  return <Donut ariaLabel="Distribuição de fichas por status" caption="fichas" slices={slices} valueLabel="fichas" />;
}

export function RelatorioCategoryDonut({ ariaLabel, items, valueLabel }: { ariaLabel: string; items: RelatorioRankItem[]; valueLabel: string }) {
  const data = items.slice(0, CHART_VISIBLE_LIMIT);

  if (data.length === 0) {
    return <p className="relatorios-muted">Nenhum dado encontrado no período.</p>;
  }

  const slices: DonutSlice[] = data.map((item, index) => ({
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    key: item.label,
    label: item.label,
    value: item.totalItens,
  }));

  return <Donut ariaLabel={ariaLabel} caption={valueLabel} slices={slices} valueLabel={valueLabel} />;
}

function Donut({ ariaLabel, caption, slices, valueLabel }: { ariaLabel: string; caption: string; slices: DonutSlice[]; valueLabel: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <RelatorioMotionBlock className="relatorios-chart relatorios-chart--donut" aria-label={ariaLabel}>
      <div className="relatorios-donut">
        <div className="relatorios-donut__chart">
          <ResponsiveContainer height={196} width="100%">
            <PieChart margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
              <Pie data={slices} dataKey="value" innerRadius={58} nameKey="label" outerRadius={88} paddingAngle={slices.length > 1 ? 2 : 0} stroke="none">
                {slices.map((slice) => (
                  <Cell fill={slice.color} key={slice.key} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${formatNumber(Number(value))} ${valueLabel}`, String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="relatorios-donut__center" aria-hidden="true">
            <strong>{formatNumber(total)}</strong>
            <span>{caption}</span>
          </div>
        </div>
        <ul className="relatorios-donut__legend">
          {slices.map((slice) => (
            <li key={slice.key}>
              <i style={{ background: slice.color }} />
              <span className="relatorios-donut__legend-label" title={slice.label}>
                {slice.label}
              </span>
              <strong>{formatNumber(slice.value)}</strong>
            </li>
          ))}
        </ul>
      </div>
    </RelatorioMotionBlock>
  );
}

export function RelatorioVendedoresChart({ items }: { items: RelatorioVendedor[] }) {
  const data = items.slice(0, CHART_VISIBLE_LIMIT);

  if (data.length === 0) {
    return <p className="relatorios-muted">Nenhum vendedor encontrado no período.</p>;
  }

  return (
    <RelatorioMotionBlock className="relatorios-chart relatorios-chart--stacked" aria-label="Fichas por vendedor por status">
      <ResponsiveContainer height={Math.max(180, data.length * 38)} width="100%">
        <BarChart data={data} layout="vertical" margin={{ bottom: 0, left: 0, right: 16, top: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
          <XAxis allowDecimals={false} axisLine={false} tickLine={false} type="number" />
          <YAxis axisLine={false} dataKey="label" tick={YAxisTick} tickLine={false} type="category" width={120} />
          <Tooltip cursor={TOOLTIP_CURSOR} formatter={(value, name) => [`${formatNumber(Number(value))} fichas`, String(name)]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: "0.78rem", paddingTop: 8 }} />
          <Bar dataKey="entregues" fill="var(--color-success)" name="Entregues" stackId="vendedor" />
          <Bar dataKey="pendentes" fill="var(--color-pending-chart)" name="Pendentes" radius={[0, 6, 6, 0]} stackId="vendedor" />
        </BarChart>
      </ResponsiveContainer>
    </RelatorioMotionBlock>
  );
}

export function RelatorioRankBars({ items, valueLabel }: { items: RelatorioRankItem[]; valueLabel: string }) {
  const data = items.slice(0, CHART_VISIBLE_LIMIT);

  if (data.length === 0) {
    return <p className="relatorios-muted">Nenhum dado encontrado no período.</p>;
  }

  const max = Math.max(...data.map((item) => item.totalItens), 1);

  return (
    <ul className="relatorios-bars" aria-label={`Ranking por ${valueLabel}`}>
      {data.map((item) => (
        <li className="relatorios-bars__row" key={item.label}>
          <MarqueeLabel text={item.label} />
          <span className="relatorios-bars__track">
            <span className="relatorios-bars__fill" style={{ width: `${Math.max(2, Math.round((item.totalItens / max) * 100))}%` }} />
          </span>
          <span className="relatorios-bars__value">{formatNumber(item.totalItens)}</span>
        </li>
      ))}
    </ul>
  );
}

function MarqueeLabel({ text }: { text: string }) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const [shift, setShift] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const measure = () => {
      const overflow = inner.scrollWidth - wrap.clientWidth;
      setShift(overflow > 2 ? overflow : 0);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [text]);

  const style = shift > 0 ? ({ "--marquee-shift": `-${shift}px`, "--marquee-duration": `${Math.max(7, Math.round(shift / 10))}s` } as CSSProperties) : undefined;

  return (
    <span className={`relatorios-bars__label${shift > 0 ? " is-marquee" : ""}`} ref={wrapRef} title={text}>
      <span className="relatorios-bars__label-inner" ref={innerRef} style={style}>
        {text}
      </span>
    </span>
  );
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
