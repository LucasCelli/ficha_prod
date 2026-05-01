import Link from "next/link";
import { Badge, Card } from "@/components/ui";

const modules = [
  {
    href: "/fichas",
    title: "Fichas",
    description: "Centro operacional para cadastro, filtros por período, pendências antigas e entrega de fichas.",
    status: "Prioritário",
  },
  {
    href: "/clientes",
    title: "Clientes",
    description: "Cadastro, busca e histórico operacional ligado às fichas.",
    status: "Operacional",
  },
  {
    href: "/relatorios",
    title: "Relatórios",
    description: "Indicadores, comparativos e exportação Excel a partir do modelo em Supabase.",
    status: "Operacional",
  },
];

export default function HomePage() {
  return (
    <>
      <header className="app-header">
        <Badge tone="info">Migração Next.js + Supabase</Badge>
        <h1 className="app-title">Fichas Técnicas</h1>
        <p className="app-summary">
          Base operacional do novo app, organizada por módulos e pronta para receber fluxos nativos sem carregar as páginas legadas.
        </p>
        <dl className="app-progress" aria-label="Progresso atual">
          <div>
            <dt>Agora</dt>
            <dd>Auth e perfis validados</dd>
          </div>
          <div>
            <dt>Proximo</dt>
            <dd>Homologacao e producao</dd>
          </div>
        </dl>
      </header>

      <ul className="module-grid" aria-label="Módulos da nova aplicação">
        {modules.map((module) => (
          <li key={module.title}>
            <Link className="module-link-card" href={module.href}>
              <Card>
                <div className="module-card-header">
                  <Badge tone={getModuleTone(module.status)}>{module.status}</Badge>
                </div>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function getModuleTone(status: string) {
  if (status === "Prioritário") return "warning";
  if (status === "Operacional") return "success";
  return "neutral";
}
