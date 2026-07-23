import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  FilePlus2,
  Layers3,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { getCurrentSession } from "@/features/auth/session";
import { DashboardCalendar } from "@/features/dashboard/dashboard-calendar";
import { getDashboardGreeting } from "@/features/dashboard/greeting";
import { DashboardWeekChart } from "@/features/dashboard/dashboard-week-chart";
import { getDashboardData } from "@/features/dashboard/data";
import type { DashboardMetrics, DashboardUpcoming } from "@/features/dashboard/data";
import { getDateInputDifferenceInDays } from "@/lib/dates";
import { formatBusinessDashboardDate, getBusinessTodayInput } from "@/lib/dates";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import type { Database } from "@/lib/supabase/database.types";
import type { LucideIcon } from "lucide-react";

type MetricCard = {
  accent: string;
  href: string;
  icon: LucideIcon;
  key: keyof DashboardMetrics;
  label: string;
};

const METRIC_CARDS: MetricCard[] = [
  { accent: "var(--color-info)", href: "/fichas", icon: FileText, key: "fichas", label: "Fichas" },
  { accent: "var(--color-pending)", href: "/fichas?status=pendente", icon: Clock3, key: "pendentes", label: "Pendentes" },
  { accent: "var(--color-success)", href: "/fichas?status=entregue", icon: CheckCircle2, key: "entregues", label: "Entregues" },
  { accent: "var(--color-primary)", href: "/clientes", icon: Users, key: "clientes", label: "Clientes" },
  { accent: "var(--color-danger)", href: "/fichas?status=atrasado", icon: CalendarClock, key: "atrasadas", label: "Atrasadas" },
];

const SHORTCUTS: { desc: string; href: string; icon: LucideIcon; label: string }[] = [
  { desc: "Registrar um novo pedido", href: "/fichas/nova", icon: FilePlus2, label: "Nova ficha" },
  { desc: "Buscar e filtrar pedidos", href: "/fichas", icon: FileText, label: "Fichas" },
  { desc: "Acompanhar a produção", href: "/quadro-producao", icon: Layers3, label: "Quadro" },
  { desc: "Base de clientes", href: "/clientes", icon: Users, label: "Clientes" },
  { desc: "Materiais e modelos", href: "/catalogos", icon: BookOpen, label: "Catálogos" },
  { desc: "Métricas e exportações", href: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { desc: "Utilitários e IA", href: "/ferramentas", icon: Wrench, label: "Ferramentas" },
];

export default async function HomePage() {
  const [result, session] = await Promise.all([getDashboardData(), getCurrentSession()]);
  const firstName = getFirstName(session?.user.displayName);
  const todayInput = getBusinessTodayInput();
  const greeting = firstName ? getDashboardGreeting(firstName) : null;

  const metrics: DashboardMetrics =
    result.kind === "ok" ? result.data.metrics : { atrasadas: 0, clientes: 0, entregues: 0, fichas: 0, pendentes: 0 };
  const recentFichas = result.kind === "ok" ? result.data.recentFichas : [];
  const upcoming = result.kind === "ok" ? result.data.upcoming : [];
  const weekSeries = result.kind === "ok" ? result.data.weekSeries : [];
  const deliveryCounts = result.kind === "ok" ? result.data.deliveryCounts : {};

  return (
    <section className="home-dashboard" aria-labelledby="home-title">
      <header className="home-dashboard__hero">
        <div className="home-dashboard__hero-copy">
          <div className="home-dashboard__greeting">
            <p className="eyebrow">Visão geral</p>
            <time dateTime={todayInput}>{formatBusinessDashboardDate()}</time>
          </div>
          <h1 id="home-title" className="home-dashboard__title">
            {greeting ? (
              <>
                {greeting.lead} <span className="home-dashboard__title-greeting">{greeting.prompt}</span>
              </>
            ) : (
              "Visão geral"
            )}
          </h1>
          <div className="home-dashboard__actions" aria-label="Ações principais">
            <Link className="ui-button ui-button--primary" href="/fichas/nova">
              <Plus size={17} aria-hidden="true" />
              Nova ficha
            </Link>
            <Link className="ui-button ui-button--secondary" href="/fichas?status=atrasado">
              <CalendarClock size={17} aria-hidden="true" />
              Atrasos
            </Link>
          </div>
        </div>
      </header>

      <div className="home-dashboard__metrics" aria-label="Indicadores principais">
        {METRIC_CARDS.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link
              className="home-metric"
              href={metric.href}
              key={metric.key}
              style={{ "--home-metric-accent": metric.accent } as CSSProperties}
            >
              <span className="home-metric__icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="home-metric__label">{metric.label}</span>
              <strong className="home-metric__value">{formatNumber(metrics[metric.key])}</strong>
            </Link>
          );
        })}
      </div>

      <div className="home-dashboard__grid">
        <div className="home-dashboard__main">
          <section className="home-panel" aria-labelledby="home-week-title">
            <div className="home-panel__header">
              <div>
                <p className="eyebrow">Últimos 7 dias</p>
                <h2 id="home-week-title">Fichas criadas</h2>
              </div>
              <Link className="home-panel__link" href="/relatorios">
                Relatórios
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <DashboardWeekChart data={weekSeries} />
          </section>

          <section className="home-panel" aria-labelledby="home-shortcuts-title">
            <div className="home-panel__header">
              <div>
                <p className="eyebrow">Atalhos</p>
                <h2 id="home-shortcuts-title">Ir para</h2>
              </div>
            </div>
            <ul className="home-shortcuts">
              {SHORTCUTS.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link className="home-shortcut" href={item.href}>
                      <span className="home-shortcut__icon" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <span className="home-shortcut__copy">
                        <strong>{item.label}</strong>
                        <small>{item.desc}</small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="home-panel" aria-labelledby="home-recent-title">
            <div className="home-panel__header">
              <div>
                <p className="eyebrow">Recentes</p>
                <h2 id="home-recent-title">Últimas fichas</h2>
              </div>
              <Link className="home-panel__link" href="/fichas">
                Abrir
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            {recentFichas.length > 0 ? (
              <ul className="home-recent-list">
                {recentFichas.map((ficha) => (
                  <li key={ficha.id}>
                    <Link href={`/fichas/${ficha.id}`}>
                      <span className="home-recent-list__avatar" aria-hidden="true">
                        {getInitials(ficha.cliente_nome_snapshot)}
                      </span>
                      <span className="home-recent-list__copy">
                        <strong>{ficha.cliente_nome_snapshot}</strong>
                        <Badge tone="neutral">{normalizePersonalizacaoLabel(ficha.arte ?? null)}</Badge>
                      </span>
                      <Badge
                        className="home-recent-list__badge"
                        tone={ficha.status === "entregue" ? "success" : ficha.status === "cancelado" ? "danger" : "pending"}
                      >
                        {formatStatus(ficha.status)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-panel__empty">Nenhuma ficha recente.</p>
            )}
          </section>
        </div>

        <aside className="home-dashboard__side" aria-label="Agenda de entregas">
          <section className="home-panel" aria-labelledby="home-calendar-title">
            <div className="home-panel__header">
              <div>
                <p className="eyebrow">Calendário</p>
                <h2 id="home-calendar-title">Entregas</h2>
              </div>
            </div>
            <DashboardCalendar deliveryCounts={deliveryCounts} today={todayInput} />
          </section>

          <section className="home-panel" aria-labelledby="home-upcoming-title">
            <div className="home-panel__header">
              <div>
                <p className="eyebrow">Agenda</p>
                <h2 id="home-upcoming-title">Próximas entregas</h2>
              </div>
            </div>

            {upcoming.length > 0 ? (
              <ul className="home-upcoming">
                {upcoming.map((ficha) => (
                  <li key={ficha.id}>
                    <Link href={`/fichas/${ficha.id}`}>
                      <span className="home-upcoming__date" aria-hidden="true">
                        <CalendarDays size={15} />
                        {formatDeliveryDate(ficha.data_entrega)}
                      </span>
                      <span className="home-upcoming__copy">
                        <strong>{ficha.cliente_nome_snapshot}</strong>
                        <small>{normalizePersonalizacaoLabel(ficha.arte ?? null)}</small>
                      </span>
                      {renderDeadlineBadge(ficha, todayInput)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-panel__empty">Nenhuma entrega agendada.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function renderDeadlineBadge(ficha: DashboardUpcoming, today: string) {
  const diff = getDateInputDifferenceInDays(ficha.data_entrega, today);

  if (diff === null) return null;

  if (diff <= 0) {
    return (
      <Badge className="home-upcoming__badge" tone="danger">
        Hoje
      </Badge>
    );
  }

  const tone = diff <= 2 ? "warning" : "neutral";
  return (
    <Badge className="home-upcoming__badge" tone={tone}>
      {diff === 1 ? "Amanhã" : `${diff} dias`}
    </Badge>
  );
}

function formatDeliveryDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);

  return label.replace(".", "");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatStatus(status: Database["public"]["Enums"]["ficha_status"]) {
  const labels = {
    cancelado: "Cancelada",
    entregue: "Entregue",
    pendente: "Pendente",
  };

  return labels[status];
}

function getFirstName(displayName: string | undefined) {
  return displayName?.trim().split(/\s+/)[0] ?? "";
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}` : words[0]?.slice(0, 2) ?? "";

  return initials.toLocaleUpperCase("pt-BR");
}
