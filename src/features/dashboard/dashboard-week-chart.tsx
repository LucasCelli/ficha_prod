"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardWeekPoint } from "./data";

type WeekTooltipProps = {
  active?: boolean;
  payload?: { payload?: DashboardWeekPoint }[];
};

const TOOLTIP_CURSOR = { fill: "color-mix(in srgb, var(--color-primary) 8%, transparent)" };

export function DashboardWeekChart({ data }: { data: DashboardWeekPoint[] }) {
  const total = data.reduce((sum, point) => sum + point.criadas, 0);

  if (total === 0) {
    return <p className="dashboard-chart__empty">Nenhuma ficha criada nos últimos 7 dias.</p>;
  }

  return (
    <div className="dashboard-chart" aria-label="Fichas criadas por dia nos últimos 7 dias">
      <ResponsiveContainer height={220} width="100%">
        <BarChart barCategoryGap="28%" data={data} margin={{ bottom: 0, left: -18, right: 4, top: 8 }}>
          <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={8} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} />
          <Tooltip content={<WeekTooltip />} cursor={TOOLTIP_CURSOR} />
          <Bar dataKey="entregues" fill="var(--color-success)" name="Entregues" radius={[0, 0, 0, 0]} stackId="dia" />
          <Bar dataKey="pendentes" fill="var(--color-pending-chart)" name="Pendentes" radius={[6, 6, 0, 0]} stackId="dia" />
        </BarChart>
      </ResponsiveContainer>
      <ul className="dashboard-chart__legend" aria-hidden="true">
        <li>
          <i style={{ background: "var(--color-pending-chart)" }} /> Pendentes
        </li>
        <li>
          <i style={{ background: "var(--color-success)" }} /> Entregues
        </li>
      </ul>
    </div>
  );
}

function WeekTooltip({ active, payload }: WeekTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="dashboard-chart__tooltip">
      <strong>{point.label}</strong>
      <span className="dashboard-chart__tooltip-row">
        <i style={{ background: "var(--color-primary)" }} /> {point.criadas} criadas
      </span>
      <span className="dashboard-chart__tooltip-row">
        <i style={{ background: "var(--color-success)" }} /> {point.entregues} entregues
      </span>
      <span className="dashboard-chart__tooltip-row">
        <i style={{ background: "var(--color-pending-chart)" }} /> {point.pendentes} pendentes
      </span>
    </div>
  );
}
