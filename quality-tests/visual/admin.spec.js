import { expect, test } from "@playwright/test";

/**
 * Superficies restritas a superadmin: /catalogos e /usuarios.
 *
 * Roda no projeto `superadmin-chromium`, que usa uma sessao propria. Ate aqui
 * essas telas nao tinham nenhuma cobertura de navegador.
 */

async function openPage(page, context, path, theme = "light") {
  await context.addCookies([{ name: "ficha_theme_preference", url: "http://127.0.0.1:3000", value: theme }]);
  await page.goto(path, { waitUntil: "load" });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await page.waitForFunction(
    () => {
      const raiz = document.querySelector(".app-frame") ?? document.body;
      return Object.keys(raiz).some((chave) => chave.startsWith("__reactFiber"));
    },
    null,
    { timeout: 15_000 },
  );
}

/**
 * Espera um controle especifico ter handler React anexado.
 *
 * O shell hidrata antes dos componentes cliente mais profundos: checar apenas
 * `.app-frame` deixa passar teclado e clique em telas como /catalogos, que
 * ficam inertes por mais alguns milissegundos.
 */
async function waitForHandler(page, selector, prop) {
  await page.waitForFunction(
    ({ selector: sel, prop: nome }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const chave = Object.keys(el).find((k) => k.startsWith("__reactProps"));
      return Boolean(chave && el[chave] && typeof el[chave][nome] === "function");
    },
    { selector, prop },
    { timeout: 15_000 },
  );
}

test.describe("acesso", () => {
  test("superadmin alcanca /catalogos e /usuarios", async ({ context, page }) => {
    await openPage(page, context, "/catalogos");
    await expect(page).toHaveURL(/\/catalogos/);
    await expect(page.locator("h1")).toHaveCount(1);

    await openPage(page, context, "/usuarios");
    await expect(page).toHaveURL(/\/usuarios/);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("a navegacao expoe os modulos administrativos e o design system", async ({ context, page }) => {
    await openPage(page, context, "/");

    const nav = page.locator("nav.app-nav");
    await expect(nav.getByRole("link", { name: "Catálogos" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Usuários" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Design system" })).toBeVisible();
  });
});

test.describe("catalogos: reordenacao por teclado", () => {
  test("o handle e um button, anuncia posicao e move com as setas", async ({ context, page }) => {
    await openPage(page, context, "/catalogos");

    const handles = page.locator("button.catalog-items-table__drag");
    const total = await handles.count();
    test.skip(total < 2, "catalogo com menos de dois itens no ambiente");
    await waitForHandler(page, "button.catalog-items-table__drag", "onKeyDown");

    await expect(handles.first()).toHaveAttribute("aria-label", new RegExp(`Posição 1 de ${total}`));

    const nomes = page.locator(".catalog-items-table__row strong");
    const primeiro = await nomes.first().textContent();
    const segundo = await nomes.nth(1).textContent();

    await handles.first().focus();
    await page.keyboard.press("ArrowDown");

    await expect(page.locator(".catalog-items-table__row strong").first()).toHaveText(segundo);
    await expect(page.locator(".catalog-items-table__row strong").nth(1)).toHaveText(primeiro);
    // o foco acompanha o item movido
    await expect(page.locator("button.catalog-items-table__drag").nth(1)).toBeFocused();
    // `.sr-only` desambigua da regiao de notificacoes do sonner, que tambem e aria-live.
    await expect(page.locator("span.sr-only[aria-live=polite]")).toContainText(/Ordem salva|Salvando ordem/);

    // desfaz para nao deixar o catalogo alterado
    await page.locator("button.catalog-items-table__drag").nth(1).focus();
    await page.keyboard.press("ArrowUp");
    await expect(page.locator(".catalog-items-table__row strong").first()).toHaveText(primeiro);
  });

  test("as instrucoes de teclado existem uma unica vez", async ({ context, page }) => {
    await openPage(page, context, "/catalogos");

    const instrucoes = page.locator("#sortable-handle-instructions");
    await expect(instrucoes).toHaveCount(1);
    await expect(instrucoes).toContainText("setas");
  });
});

test.describe("estrutura das telas administrativas", () => {
  for (const rota of ["/catalogos", "/usuarios", "/usuarios/perfis"]) {
    test(`${rota} tem um h1 e title proprio`, async ({ context, page }) => {
      await openPage(page, context, rota);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).not.toHaveTitle("Fichas Tecnicas");
    });
  }

  test("/usuarios/perfis expoe labels nos filtros", async ({ context, page }) => {
    await openPage(page, context, "/usuarios/perfis");

    for (const id of ["perfis-busca", "perfis-autor"]) {
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toHaveCount(1);
      await expect(label).not.toBeEmpty();
    }
  });

  test("nenhuma tela administrativa gera scroll horizontal", async ({ context, page }) => {
    for (const rota of ["/catalogos", "/usuarios", "/usuarios/perfis"]) {
      await openPage(page, context, rota);
      const medida = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(medida.scroll, `overflow horizontal em ${rota}`).toBeLessThanOrEqual(medida.client + 1);
    }
  });
});

test.describe("baseline visual das telas administrativas", () => {
  for (const [rota, slug] of [
    ["/catalogos", "catalogos"],
    ["/usuarios", "usuarios"],
    ["/usuarios/perfis", "usuarios-perfis"],
  ]) {
    for (const theme of ["light", "dark"]) {
      test(`${slug} ${theme}`, async ({ context, page }) => {
        await openPage(page, context, rota, theme);

        await expect(page).toHaveScreenshot(`${slug}-${theme}.png`, {
          animations: "disabled",
          caret: "hide",
          fullPage: true,
          mask: [page.locator(".catalog-items-table__body"), page.locator("tbody"), page.locator("[class*=rows]")],
        });
      });
    }
  }
});
