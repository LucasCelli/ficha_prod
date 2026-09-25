import { formatBusinessDateTime, formatDayMonthInput, getBusinessWeekRange } from "@/lib/dates";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import { isFichaOverdue, type FichaFilters, type FichaListItem } from "./data";

export type WeeklyReportMode = "current-week" | "next-week";

type ReportSection = {
  fichas: FichaListItem[];
  title: string;
  tone: "danger" | "evento" | "info";
};

type OperationalReportProps = {
  fichas: FichaListItem[];
  filters: FichaFilters;
  weeklyMode?: WeeklyReportMode;
};

export function OperationalReport({ fichas, filters, weeklyMode }: OperationalReportProps) {
  const { mainTitle, title } = getModeMeta(weeklyMode);
  const eventoCount = fichas.filter((ficha) => ficha.evento).length;
  const overdueCount = fichas.filter((ficha) => isFichaOverdue(ficha)).length;
  const meta = [
    formatFilters(filters),
    `${formatNumber(fichas.length)} fichas`,
    eventoCount ? `${formatNumber(eventoCount)} eventos` : "",
    overdueCount ? `${formatNumber(overdueCount)} atrasadas` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const sections = buildSections(fichas, mainTitle);

  return (
    <article className="ops-report" id="print-version">
      <header className="ops-report__header">
        <h1>{title}</h1>
        <span>{formatBusinessDateTime(new Date())}</span>
        <p>{meta}</p>
      </header>

      {sections.length === 0 ? <p className="ops-report__empty">Nenhuma ficha no período.</p> : null}

      {sections.map((section) => (
        <section className={`ops-report__section ops-report__section--${section.tone}`} key={section.title}>
          <h2>
            {section.title} ({formatNumber(section.fichas.length)})
          </h2>
          <table>
            <colgroup>
              <col className="ops-report__col-cliente" />
              <col className="ops-report__col-vendedor" />
              <col className="ops-report__col-data" />
              <col className="ops-report__col-data" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Vendedor</th>
                <th scope="col">Início</th>
                <th scope="col">Entrega</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            {groupByPersonalizacao(section.fichas).map(([label, groupFichas]) => (
              <tbody key={label}>
                <tr className="ops-report__group">
                  <th colSpan={5} scope="colgroup">
                    {label} · {formatNumber(groupFichas.length)}
                  </th>
                </tr>
                {mergeSameOrder(groupFichas).map(({ count, ficha, delivered }) => (
                  <tr
                    className={ficha.evento ? "ops-report__row--evento" : isFichaOverdue(ficha) ? "ops-report__row--overdue" : undefined}
                    key={ficha.id}
                  >
                    <td className="ops-report__cliente">
                      {ficha.cliente_nome_snapshot}
                      {count > 1 ? ` (${formatNumber(count)} Fichas)` : ""}
                    </td>
                    <td>{ficha.vendedor || "Sem vendedor"}</td>
                    <td>{ficha.data_inicio ? formatDayMonthInput(ficha.data_inicio) : "—"}</td>
                    <td>{formatDayMonthInput(ficha.data_entrega)}</td>
                    {/* Em branco para anotação manual; só entregues vêm preenchidas. */}
                    <td>{delivered ? "Entregue" : ""}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </section>
      ))}
    </article>
  );
}

export function resolveWeeklyReportMode(filters: FichaFilters): WeeklyReportMode | undefined {
  if (!filters.dataInicio || !filters.dataFim || filters.status) {
    return undefined;
  }

  const currentWeek = getBusinessWeekRange();
  const nextWeek = getBusinessWeekRange(1);

  if (filters.dataInicio === currentWeek.start && filters.dataFim === currentWeek.end) {
    return "current-week";
  }

  if (filters.dataInicio === nextWeek.start && filters.dataFim === nextWeek.end) {
    return "next-week";
  }

  return undefined;
}

function getModeMeta(weeklyMode?: WeeklyReportMode) {
  if (weeklyMode === "current-week") {
    return { mainTitle: "Esta semana", title: "Produção · Esta semana" };
  }

  if (weeklyMode === "next-week") {
    return { mainTitle: "Próxima semana", title: "Produção · Próxima semana" };
  }

  return { mainTitle: "Período", title: "Fichas" };
}

// Eventos primeiro, depois atrasadas, depois o restante do período.
function buildSections(fichas: FichaListItem[], mainTitle: string): ReportSection[] {
  const sections: ReportSection[] = [
    { fichas: fichas.filter((ficha) => ficha.evento), title: "Eventos", tone: "evento" },
    { fichas: fichas.filter((ficha) => !ficha.evento && isFichaOverdue(ficha)), title: "Atrasadas", tone: "danger" },
    { fichas: fichas.filter((ficha) => !ficha.evento && !isFichaOverdue(ficha)), title: mainTitle, tone: "info" },
  ];

  return sections.filter((section) => section.fichas.length > 0);
}

function groupByPersonalizacao(fichas: FichaListItem[]) {
  // Chave sem caixa: dados legados trazem "Sem personalização" e "Sem Personalização".
  const groups = new Map<string, { items: FichaListItem[]; label: string }>();

  for (const ficha of fichas) {
    const label = normalizePersonalizacaoLabel(ficha.arte);
    const key = label.toLocaleLowerCase("pt-BR");
    const group = groups.get(key) ?? { items: [], label };
    group.items.push(ficha);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map(({ items, label }) => [label, items.sort(compareFichas)] as const)
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

// Fichas do mesmo pedido (cliente + venda + entrega) viram uma linha só.
function mergeSameOrder(fichas: FichaListItem[]) {
  const rows = new Map<string, { count: number; delivered: boolean; ficha: FichaListItem }>();

  for (const ficha of fichas) {
    const key = [ficha.cliente_nome_snapshot, ficha.numero_venda ?? "", ficha.data_entrega].join("|");
    const row = rows.get(key);
    const delivered = ficha.status === "entregue";
    if (row) {
      row.count += 1;
      row.delivered &&= delivered;
    } else {
      rows.set(key, { count: 1, delivered, ficha });
    }
  }

  return Array.from(rows.values());
}

function compareFichas(a: FichaListItem, b: FichaListItem) {
  return (
    a.data_entrega.localeCompare(b.data_entrega) ||
    (a.vendedor ?? "").localeCompare(b.vendedor ?? "", "pt-BR") ||
    a.cliente_nome_snapshot.localeCompare(b.cliente_nome_snapshot, "pt-BR")
  );
}

function formatFilters(filters: FichaFilters) {
  return [
    filters.dataInicio && filters.dataFim ? `${formatDateLong(filters.dataInicio)} a ${formatDateLong(filters.dataFim)}` : "",
    filters.busca ? `Busca: ${filters.busca}` : "",
    filters.status === "atrasado" ? "Atrasadas" : filters.status === "pendente" ? "Pendentes" : filters.status === "entregue" ? "Entregues" : "",
    filters.evento === true ? "Só eventos" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatDateLong(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
