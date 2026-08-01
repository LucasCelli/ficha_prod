/**
 * Fonte unica dos tokens exibidos em /design-system.
 *
 * Os valores vivem em `src/styles/tokens/colors.css` e no `:root` de
 * `src/styles/globals.css`; aqui listamos apenas os NOMES, para que o catalogo
 * renderize o valor real resolvido pelo tema ativo.
 */

export type TokenGroup = {
  description: string;
  title: string;
  tokens: string[];
};

export const colorGroups: TokenGroup[] = [
  {
    description: "Superficies e texto. Nunca use cor de superficie hardcoded em componente.",
    title: "Fundação",
    tokens: [
      "--color-bg",
      "--color-surface",
      "--color-surface-2",
      "--color-surface-3",
      "--color-surface-elevated",
      "--color-text",
      "--color-text-secondary",
      "--color-muted",
      "--color-border",
      "--color-border-subtle",
    ],
  },
  {
    description:
      "--color-primary é a cor de marca e de fundo. Para TEXTO sobre fundo claro use --color-primary-text: o azul de marca falha WCAG AA em corpo pequeno.",
    title: "Primária",
    tokens: [
      "--color-primary",
      "--color-primary-hover",
      "--color-primary-active",
      "--color-primary-bg",
      "--color-primary-contrast",
      "--color-primary-text",
    ],
  },
  {
    description: "Status. Nunca dependa apenas da cor: acompanhe sempre de texto ou ícone.",
    title: "Feedback",
    tokens: [
      "--color-success",
      "--color-success-bg",
      "--color-pending",
      "--color-pending-bg",
      "--color-warning",
      "--color-warning-bg",
      "--color-danger",
      "--color-danger-bg",
      "--color-info",
      "--color-info-bg",
    ],
  },
  {
    description: "Ordem estável de séries em gráficos. Use sempre nesta ordem, com variante dark garantida.",
    title: "Gráficos",
    tokens: [
      "--color-chart-1",
      "--color-chart-2",
      "--color-chart-3",
      "--color-chart-4",
      "--color-chart-5",
      "--color-chart-6",
      "--color-chart-7",
      "--color-chart-8",
    ],
  },
];

export const spacingTokens = [
  "--space-4",
  "--space-8",
  "--space-10",
  "--space-12",
  "--space-14",
  "--space-16",
  "--space-18",
  "--space-20",
  "--space-24",
  "--space-32",
];

export const radiusTokens = ["--radius-sm", "--radius-md", "--radius-lg", "--radius-xl"];

export const shadowTokens = ["--shadow-xs", "--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-focus"];

export const controlTokens = ["--control-size-sm", "--control-size-md", "--control-size-lg", "--touch-target-min"];

export const typeScale = [
  { label: "Display / h1", token: "--font-size-3xl", weight: "800" },
  { label: "Título de seção / h2", token: "--font-size-2xl", weight: "800" },
  { label: "Subtítulo / h3", token: "--font-size-xl", weight: "700" },
  { label: "Corpo", token: "--font-size-md", weight: "400" },
  { label: "Corpo compacto", token: "--font-size-sm", weight: "400" },
  { label: "Metadados (mínimo legível)", token: "--font-size-meta", weight: "700" },
];

export const breakpoints = [
  { label: "sm", note: "Telefone em pé. Cards em coluna única.", value: "480px" },
  { label: "md", note: "Telefone deitado e tablet. Tabelas viram cards quando responsiveMode=\"cards\".", value: "768px" },
  { label: "lg", note: "Tablet grande e notebook. Painéis lado a lado.", value: "1024px" },
  { label: "xl", note: "Desktop. Densidade máxima.", value: "1280px" },
];
