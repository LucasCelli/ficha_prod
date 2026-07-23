"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type DashboardCalendarProps = {
  deliveryCounts: Record<string, number>;
  today: string;
};

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toInput(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function DashboardCalendar({ deliveryCounts, today }: DashboardCalendarProps) {
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ month: (todayMonth ?? 1) - 1, year: todayYear ?? new Date().getFullYear() });

  const maxCount = useMemo(() => Math.max(1, ...Object.values(deliveryCounts)), [deliveryCounts]);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.year, cursor.month, 1);
    const leading = firstOfMonth.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

    const items: ({ dateInput: string; day: number } | null)[] = [];
    for (let i = 0; i < leading; i += 1) items.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ dateInput: toInput(cursor.year, cursor.month, day), day });
    }
    while (items.length % 7 !== 0) items.push(null);

    return items;
  }, [cursor]);

  const monthLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
      new Date(cursor.year, cursor.month, 1),
    );
    return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
  }, [cursor]);

  const monthTotal = useMemo(
    () =>
      Object.entries(deliveryCounts).reduce((sum, [key, count]) => {
        const [y, m] = key.split("-").map(Number);
        return y === cursor.year && (m ?? 0) - 1 === cursor.month ? sum + count : sum;
      }, 0),
    [cursor, deliveryCounts],
  );

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { month: next.getMonth(), year: next.getFullYear() };
    });
  }

  return (
    <div className="dashboard-calendar">
      <div className="dashboard-calendar__head">
        <div className="dashboard-calendar__title">
          <strong>{monthLabel}</strong>
          <span>{monthTotal > 0 ? `${monthTotal} ${monthTotal === 1 ? "entrega" : "entregas"}` : "sem entregas"}</span>
        </div>
        <div className="dashboard-calendar__nav">
          <button aria-label="Mês anterior" onClick={() => shiftMonth(-1)} type="button">
            <ChevronLeft size={16} />
          </button>
          <button aria-label="Próximo mês" onClick={() => shiftMonth(1)} type="button">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="dashboard-calendar__weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday, index) => (
          <span className={index === 0 || index === 6 ? "is-weekend" : undefined} key={weekday}>
            {weekday}
          </span>
        ))}
      </div>

      <div className="dashboard-calendar__grid">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span aria-hidden="true" className="dashboard-calendar__cell is-empty" key={`empty-${index}`} />;
          }

          const count = deliveryCounts[cell.dateInput] ?? 0;
          const dayOfWeek = new Date(cursor.year, cursor.month, cell.day).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = cell.dateInput === today;
          const isPast = cell.dateInput < today;
          const intensity = count > 0 ? Math.min(1, 0.35 + (count / maxCount) * 0.65) : 0;
          const className = [
            "dashboard-calendar__cell",
            isWeekend ? "is-weekend" : "",
            isToday ? "is-today" : "",
            count > 0 ? "has-deliveries" : "",
            count > 0 && isPast ? "is-overdue" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <>
              <span className="dashboard-calendar__day">{cell.day}</span>
              {count > 0 ? <span className="dashboard-calendar__count">{count}</span> : null}
            </>
          );

          if (count === 0) {
            return (
              <span className={className} key={cell.dateInput}>
                {content}
              </span>
            );
          }

          return (
            <Link
              className={className}
              href={`/fichas?dataInicio=${cell.dateInput}&dataFim=${cell.dateInput}`}
              key={cell.dateInput}
              style={{ "--cell-intensity": intensity } as CSSProperties}
              title={`${count} ${count === 1 ? "entrega" : "entregas"} em ${cell.dateInput.split("-").reverse().join("/")}`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
