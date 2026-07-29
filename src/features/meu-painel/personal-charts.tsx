"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SeriesPoint = { date: string; total: number };
type StatusSlice = { label: string; value: number; color: string };
const number = new Intl.NumberFormat("pt-BR");
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });

export function PersonalProductivityChart({ data }: { data: SeriesPoint[] }) {
  const chartData = data.map((point) => ({ ...point, label: shortDate.format(new Date(`${point.date}T12:00:00Z`)).replace(".", "") }));
  if (!chartData.length) return <p>Sem dados de produção no período.</p>;
  return <div className="profile-chart" aria-label="Evolução de fichas criadas no período">
    <ResponsiveContainer height={220} width="100%"><AreaChart data={chartData} margin={{ bottom: 0, left: -20, right: 6, top: 12 }}>
      <defs><linearGradient id="profile-productivity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.34}/><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02}/></linearGradient></defs>
      <CartesianGrid stroke="var(--color-border-subtle)" vertical={false}/><XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={24} tickLine={false} tickMargin={9}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38}/>
      <Tooltip cursor={{ stroke: "var(--color-border)" }} formatter={(value) => [`${number.format(Number(value))} fichas`, "Criadas"]} labelFormatter={(_, payload) => payload[0]?.payload?.date ? formatFullDate(payload[0].payload.date) : ""}/>
      <Area dataKey="total" fill="url(#profile-productivity-fill)" name="Fichas criadas" stroke="var(--color-primary)" strokeWidth={2.5} type="monotone"/>
    </AreaChart></ResponsiveContainer>
  </div>;
}

export function PersonalStatusChart({ data }: { data: StatusSlice[] }) {
  const visible = data.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);
  if (!visible.length) return <p className="profile-chart-empty">Nenhuma ficha no período.</p>;
  return <div className="profile-status-chart" aria-label="Distribuição de fichas por status">
    <div className="profile-status-chart__donut"><ResponsiveContainer height={150} width="100%"><PieChart><Pie data={visible} dataKey="value" innerRadius={45} nameKey="label" outerRadius={68} paddingAngle={2} stroke="none">{visible.map((slice) => <Cell fill={slice.color} key={slice.label}/>)}</Pie><Tooltip formatter={(value, name) => [`${number.format(Number(value))} fichas`, String(name)]}/></PieChart></ResponsiveContainer><div className="profile-status-chart__total"><strong>{number.format(total)}</strong><span>fichas</span></div></div>
    <ul>{data.map((slice) => <li key={slice.label}><i style={{ background: slice.color }}/><span>{slice.label}</span><strong>{number.format(slice.value)}</strong></li>)}</ul>
  </div>;
}

function formatFullDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)); }