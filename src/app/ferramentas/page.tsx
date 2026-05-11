import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, WandSparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Ferramentas | Fichas Tecnicas",
};

const tools = [
  {
    href: "/ferramentas/organizar-nomes-ia",
    icon: WandSparkles,
    label: "Organizar nomes com IA",
  },
];

export default function FerramentasPage() {
  return (
    <section className="tools-page" aria-labelledby="tools-title">
      <header className="tools-page__header">
        <p className="eyebrow">Ferramentas</p>
        <h1 id="tools-title">Ferramentas</h1>
      </header>

      <ul className="tools-page__grid">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <li key={tool.href}>
              <Link className="tools-page__card" href={tool.href}>
                <span className="tools-page__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <strong>{tool.label}</strong>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
