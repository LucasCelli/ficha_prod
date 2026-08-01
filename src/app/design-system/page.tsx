import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireAppSession } from "@/features/auth/session";
import { ComponentGallery } from "@/features/design-system/component-gallery";
import {
  breakpoints,
  colorGroups,
  controlTokens,
  radiusTokens,
  shadowTokens,
  spacingTokens,
  typeScale,
} from "@/features/design-system/catalog";
import { ColorSwatch, TokenRow } from "@/features/design-system/showcase";
import styles from "@/features/design-system/design-system.module.css";

export const metadata: Metadata = {
  title: "Design system | Fichas Técnicas",
};

const sections = [
  { id: "ds-cores", label: "Cores" },
  { id: "ds-tipografia", label: "Tipografia" },
  { id: "ds-escala", label: "Escalas" },
  { id: "ds-breakpoints", label: "Breakpoints" },
  { id: "ds-componentes", label: "Componentes" },
];

const scales = [
  { items: spacingTokens, preview: "space" as const, title: "Espaçamento" },
  { items: radiusTokens, preview: "radius" as const, title: "Raios" },
  { items: shadowTokens, preview: "shadow" as const, title: "Elevação" },
  { items: controlTokens, preview: "size" as const, title: "Controles" },
];

export default async function DesignSystemPage() {
  await requireAppSession();

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Referência" id="design-system-title" title="Design system">
        <p className={styles.lead}>
          Catálogo vivo dos tokens e primitivos de <code>src/components/ui</code>. Antes de criar UI nova, procure aqui.
        </p>
      </PageHeader>

      <nav aria-label="Seções do design system">
        <ul className={styles.toc}>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="ds-cores-title" className={styles.section} id="ds-cores">
        <header className={styles.sectionHeader}>
          <h2 id="ds-cores-title">Cores</h2>
          <p>
            Definidas em <code>src/styles/tokens/colors.css</code>, com par claro e escuro obrigatório.
          </p>
        </header>
        {colorGroups.map((group) => (
          <div className={styles.tokenGroup} key={group.title}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            <p className={styles.groupNote}>{group.description}</p>
            <ul className={styles.swatchList}>
              {group.tokens.map((token) => (
                <ColorSwatch key={token} token={token} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="ds-tipografia-title" className={styles.section} id="ds-tipografia">
        <header className={styles.sectionHeader}>
          <h2 id="ds-tipografia-title">Tipografia</h2>
          <p>Plus Jakarta Sans para interface, Playfair Display para display e mono para tokens e código.</p>
        </header>
        <div>
          {typeScale.map((entry) => (
            <div className={styles.typeSample} key={entry.token}>
              <span style={{ fontSize: `var(${entry.token})`, fontWeight: entry.weight, lineHeight: 1.2 }}>{entry.label}</span>
              <small>
                {entry.token} · peso {entry.weight}
              </small>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ds-escala-title" className={styles.section} id="ds-escala">
        <header className={styles.sectionHeader}>
          <h2 id="ds-escala-title">Espaçamento, raios, elevação e controles</h2>
          <p>Escala compartilhada. Prefira o token à medida literal em px.</p>
        </header>
        <div className={styles.scaleGrid}>
          {scales.map((scale) => (
            <div className={styles.scaleColumn} key={scale.title}>
              <h3 className={styles.groupTitle}>{scale.title}</h3>
              <ul className={styles.tokenList}>
                {scale.items.map((token) => (
                  <TokenRow key={token} preview={scale.preview} token={token} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ds-breakpoints-title" className={styles.section} id="ds-breakpoints">
        <header className={styles.sectionHeader}>
          <h2 id="ds-breakpoints-title">Breakpoints</h2>
          <p>Quatro cortes oficiais. Para painéis reutilizáveis, prefira container queries a novos cortes.</p>
        </header>
        <table className={styles.inventory}>
          <caption className="sr-only">Breakpoints oficiais do projeto</caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Largura</th>
              <th scope="col">Uso</th>
            </tr>
          </thead>
          <tbody>
            {breakpoints.map((entry) => (
              <tr key={entry.label}>
                <td>
                  <code>{entry.label}</code>
                </td>
                <td>
                  <code>{entry.value}</code>
                </td>
                <td>{entry.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="ds-componentes-title" className={styles.section} id="ds-componentes">
        <header className={styles.sectionHeader}>
          <h2 id="ds-componentes-title">Componentes</h2>
          <p>Preview ao vivo, variações, snippet e regras de uso. Falta variante? Evolua o primitivo, não copie local.</p>
        </header>
        <ComponentGallery />
      </section>
    </div>
  );
}
