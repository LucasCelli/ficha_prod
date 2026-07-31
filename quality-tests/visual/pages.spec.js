import { expect, test } from "@playwright/test";

const themes = ["light", "dark"];
const activePages = [
  { path: "/", slug: "inicio" },
  { path: "/fichas", slug: "fichas" },
  { path: "/clientes", slug: "clientes" },
  { path: "/quadro-producao", slug: "quadro-producao" },
  { path: "/relatorios", slug: "relatorios" },
  { path: "/ferramentas", slug: "ferramentas" },
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
}

test.describe("rotas ativas do App Router", () => {
  for (const pageDefinition of activePages) {
    for (const theme of themes) {
      test(`${pageDefinition.slug} ${theme}`, async ({ context, page }) => {
        await openStablePage(page, context, pageDefinition.path, theme);

        await expect(page).toHaveScreenshot(`${pageDefinition.slug}-${theme}.png`, {
          animations: "disabled",
          caret: "hide",
          fullPage: true,
          mask: [
            page.locator("tbody"),
            page.locator(".dashboard-calendar"),
            page.locator(".dashboard-week-chart"),
            page.locator(".quadro-producao-board"),
          ],
        });
      });
    }
  }
});

test("modal ativo de novo cliente", async ({ context, page }) => {
  await openStablePage(page, context, "/clientes?modal=novo", "light");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Novo cliente" }).first()).toBeVisible();
  await expect(page).toHaveScreenshot("clientes-novo-modal-light.png", {
    animations: "disabled",
    caret: "hide",
  });
});
