import { expect, test } from "@playwright/test";

const themes = ["light", "dark"];

/**
 * Matriz de rota x estado.
 *
 * `mask` deve conter apenas dados textuais instaveis (valores vindos do banco,
 * datas relativas). Estrutura, dimensoes e componentes ficam de fora da mascara:
 * sao justamente o que a baseline precisa proteger.
 */
const scenarios = [
  { path: "/", slug: "inicio", mask: [".home-metric__value", ".dashboard-calendar__grid", ".home-recent-list", ".home-upcoming"] },
  { path: "/fichas", slug: "fichas", mask: ["tbody", ".results-summary"] },
  { path: "/fichas?status=pendente", slug: "fichas-pendentes", mask: ["tbody", ".results-summary"] },
  { path: "/fichas?busca=zzzznaoexiste", slug: "fichas-vazio", mask: [] },
  { path: "/clientes", slug: "clientes", mask: ["tbody", ".clientes-kpi__value"] },
  { path: "/clientes?termo=zzzznaoexiste", slug: "clientes-vazio", mask: [".clientes-kpi__value"] },
  { path: "/quadro-producao", slug: "quadro-producao", mask: [".quadro-producao-column__list"] },
  { path: "/relatorios", slug: "relatorios", mask: [".relatorios-chart", ".relatorios-summary", ".relatorios-bars"] },
  { path: "/ferramentas", slug: "ferramentas", mask: [] },
  { path: "/ferramentas/organizar-nomes-ia", slug: "organizar-nomes-ia", mask: [] },
  { path: "/meu-painel", slug: "meu-painel", mask: ["tbody", ".ui-chart-frame__canvas", "[class*=metric]", "[class*=insights]", "[class*=upcoming]"] },
  { path: "/design-system", slug: "design-system", mask: ["[class*=swatch] small", "[class*=tokenRow] small"] },
];

async function openStablePage(page, context, path, theme) {
  await context.addCookies([
    {
      name: "ficha_theme_preference",
      url: "http://127.0.0.1:3000",
      value: theme,
    },
  ]);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#conteudo")).toBeVisible();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await settleLayout(page);
}

/**
 * Espera as fontes carregarem e a altura do documento parar de mudar.
 *
 * Sem isto, paginas com conteudo que assenta depois da hidratacao (editor de
 * lista, graficos) geravam baselines de altura diferente a cada execucao.
 */
async function settleLayout(page) {
  await page.evaluate(() => document.fonts?.ready);

  let previous = -1;
  let stableRounds = 0;
  for (let attempt = 0; attempt < 40 && stableRounds < 3; attempt += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    stableRounds = height === previous ? stableRounds + 1 : 0;
    previous = height;
    await page.waitForTimeout(150);
  }
}

test.describe("rotas ativas do App Router", () => {
  for (const scenario of scenarios) {
    for (const theme of themes) {
      test(`${scenario.slug} ${theme}`, async ({ context, page }) => {
        await openStablePage(page, context, scenario.path, theme);

        await expect(page).toHaveScreenshot(`${scenario.slug}-${theme}.png`, {
          animations: "disabled",
          caret: "hide",
          fullPage: true,
          mask: scenario.mask.map((selector) => page.locator(selector)),
        });
      });
    }
  }
});

test.describe("estados de modal", () => {
  const modalStates = [
    { path: "/clientes?modal=novo", slug: "clientes-novo-modal" },
    { path: "/fichas/nova", slug: "fichas-nova" },
  ];

  for (const state of modalStates) {
    test(`${state.slug} light`, async ({ context, page }) => {
      await openStablePage(page, context, state.path, "light");
      await expect(page.locator(".modal-content, .ficha-form").first()).toBeVisible();

      await expect(page).toHaveScreenshot(`${state.slug}-light.png`, {
        animations: "disabled",
        caret: "hide",
        mask: [page.locator("tbody")],
      });
    });
  }
});
