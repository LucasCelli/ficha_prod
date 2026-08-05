import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Crop, Scissors, WandSparkles } from "lucide-react";
import { requireAppSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Ferramentas | Fichas Técnicas",
};

const tools = [
  {
    description: "Planeje quantidades, tecidos, grades e enfestos antes do encaixe no Audaces.",
    href: "/ferramentas/plano-de-corte",
    icon: Scissors,
    label: "Plano de Corte",
  },
  {
    description: "Ajuste enquadramento e proporção antes de publicar suas imagens.",
    href: "/ferramentas/cortar-imagem",
    icon: Crop,
    label: "Cortar imagem para Instagram",
  },
  {
    description: "Organize listas de nomes, tamanhos e observações com auxílio da IA.",
    href: "/ferramentas/organizar-nomes-ia",
    icon: WandSparkles,
    label: "Organizar nomes com IA",
  },
];

export default async function FerramentasPage() {
  await requireAppSession();

  return (
    <section className="tools-page" aria-labelledby="tools-title">
      <header className="tools-page__header">
        <h1 id="tools-title">Ferramentas</h1>
      </header>

      <ul className="tools-page__grid">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <li key={tool.href}>
              <Link className="tools-page__card" href={tool.href}>
                <span className="tools-page__icon" aria-hidden="true">
                  <Icon size={24} />
                </span>
                <ArrowRight className="tools-page__arrow" size={18} aria-hidden="true" />
                <span className="tools-page__copy">
                  <strong>{tool.label}</strong>
                  <span>{tool.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
