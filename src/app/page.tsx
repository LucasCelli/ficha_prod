import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, FileText, Layers3, Plus } from "lucide-react";
import { Badge } from "@/components/ui";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type HomeMetric = {
  href: string;
  label: string;
  tone: "info" | "success" | "warning";
  value: string;
};

type HomeFicha = Pick<
  Database["public"]["Tables"]["fichas"]["Row"],
  "id" | "cliente_nome_snapshot" | "data_entrega" | "status" | "arte"
>;

type HomeDashboardData =
  | {
      kind: "ok";
      metrics: HomeMetric[];
      recentFichas: HomeFicha[];
    }
  | {
      kind: "not-configured";
      metrics: HomeMetric[];
      recentFichas: [];
    }
  | {
      kind: "error";
      message: string;
      metrics: HomeMetric[];
      recentFichas: [];
    };

const operationalLinks = [
  {
    href: "/fichas",
    icon: FileText,
    label: "Fichas",
  },
  {
    href: "/quadro-producao",
    icon: Layers3,
    label: "Quadro",
  },
  {
    href: "/relatorios",
    icon: BarChart3,
    label: "Relatórios",
  },
];

export default async function HomePage() {
  const dashboard = await getHomeDashboardData();

  return (
    <section className="home-dashboard" aria-labelledby="home-title">
      <header className="home-dashboard__hero">
        <div className="home-dashboard__hero-copy">
          <Badge tone="info">Produção</Badge>
          <h1 id="home-title" className="home-dashboard__title">
            Visão geral
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
        {dashboard.metrics.map((metric) => (
          <Link className={`home-metric home-metric--${metric.tone}`} href={metric.href} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </Link>
        ))}
      </div>

      <div className="home-dashboard__grid">
        <section className="home-panel" aria-labelledby="home-workflow-title">
          <div className="home-panel__header">
            <div>
              <Badge tone="success">Atalhos</Badge>
              <h2 id="home-workflow-title">Rotina</h2>
            </div>
          </div>

          <ul className="home-workflow-list">
            {operationalLinks.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link className="home-workflow-card" href={item.href}>
                    <span className="home-workflow-card__icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <span className="home-workflow-card__copy">
                      <strong>{item.label}</strong>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="home-panel" aria-labelledby="home-recent-title">
          <div className="home-panel__header">
            <div>
              <Badge tone="warning">Recentes</Badge>
              <h2 id="home-recent-title">Últimas fichas</h2>
            </div>
            <Link className="home-panel__link" href="/fichas">
              Abrir
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {dashboard.recentFichas.length > 0 ? (
            <ul className="home-recent-list">
              {dashboard.recentFichas.map((ficha) => (
                <li key={ficha.id}>
                  <Link href={`/fichas/${ficha.id}`}>
                    <span>
                      <strong>{ficha.cliente_nome_snapshot}</strong>
                      <small>{ficha.arte || "Sem personalização"}</small>
                    </span>
                    <Badge tone={ficha.status === "entregue" ? "success" : "warning"}>{formatStatus(ficha.status)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="home-panel__empty">Nenhuma ficha recente.</p>
          )}
        </section>
      </div>
    </section>
  );
}

async function getHomeDashboardData(): Promise<HomeDashboardData> {
  const fallbackMetrics = buildMetrics({
    clientes: 0,
    entregues: 0,
    fichas: 0,
    pendentes: 0,
    vencidas: 0,
  });

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      kind: "not-configured",
      metrics: fallbackMetrics,
      recentFichas: [],
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const today = getBusinessTodayInput();

    const [fichasResult, pendentesResult, entreguesResult, vencidasResult, clientesResult, recentResult] = await Promise.all([
      supabase.from("fichas").select("id", { count: "exact", head: true }),
      supabase.from("fichas").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("fichas").select("id", { count: "exact", head: true }).eq("status", "entregue"),
      supabase.from("fichas").select("id", { count: "exact", head: true }).neq("status", "entregue").lt("data_entrega", today),
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase
        .from("fichas")
        .select("id, cliente_nome_snapshot, data_entrega, status, arte")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const error = fichasResult.error ?? pendentesResult.error ?? entreguesResult.error ?? vencidasResult.error ?? clientesResult.error ?? recentResult.error;

    if (error) {
      return {
        kind: "error",
        message: error.message,
        metrics: fallbackMetrics,
        recentFichas: [],
      };
    }

    return {
      kind: "ok",
      metrics: buildMetrics({
        clientes: clientesResult.count ?? 0,
        entregues: entreguesResult.count ?? 0,
        fichas: fichasResult.count ?? 0,
        pendentes: pendentesResult.count ?? 0,
        vencidas: vencidasResult.count ?? 0,
      }),
      recentFichas: recentResult.data ?? [],
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao carregar a visão geral.",
      metrics: fallbackMetrics,
      recentFichas: [],
    };
  }
}

function buildMetrics(input: { clientes: number; entregues: number; fichas: number; pendentes: number; vencidas: number }) {
  return [
    {
      href: "/fichas",
      label: "Fichas",
      tone: "info",
      value: formatNumber(input.fichas),
    },
    {
      href: "/fichas?status=pendente",
      label: "Pendentes",
      tone: "warning",
      value: formatNumber(input.pendentes),
    },
    {
      href: "/fichas?status=entregue",
      label: "Entregues",
      tone: "success",
      value: formatNumber(input.entregues),
    },
    {
      href: "/clientes",
      label: "Clientes",
      tone: "info",
      value: formatNumber(input.clientes),
    },
    {
      href: "/fichas?status=atrasado",
      label: "Atrasadas",
      tone: input.vencidas > 0 ? "warning" : "success",
      value: formatNumber(input.vencidas),
    },
  ] satisfies HomeMetric[];
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

function getBusinessTodayInput() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Cuiaba",
    year: "numeric",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}
