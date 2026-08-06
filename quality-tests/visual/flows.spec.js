import { expect, test } from "@playwright/test";

/**
 * Testes funcionais das superficies que a auditoria visual nao cobria.
 *
 * Diferente de `pages.spec.js`, aqui nao ha baseline de imagem: sao contratos
 * de comportamento (dialogo abre, teclado reordena, grafico tem alternativa
 * textual). Regressoes nesses pontos falham mesmo que o screenshot passe.
 */

async function openPage(page, context, path, theme = "light") {
  await context.addCookies([{ name: "ficha_theme_preference", url: "http://127.0.0.1:3000", value: theme }]);
  await page.goto(path, { waitUntil: "load" });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await waitForHydration(page);
}

/**
 * Espera o React assumir o DOM.
 *
 * Sem isto, um clique disparado na janela entre `load` e a hidratacao e perdido:
 * o handler do `next/link` ja preveniu o default mas o router ainda nao responde.
 * Isso deixava os testes de modal instaveis em cerca de 40% das execucoes.
 */
async function waitForHydration(page) {
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
 * O shell hidrata antes dos componentes cliente mais profundos, entao esperar
 * so pelo `.app-frame` deixa passar teclado e clique em controles internos.
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

test.describe("modais roteaveis", () => {
  test("clientes: ?modal=novo abre por acesso direto", async ({ context, page }) => {
    await openPage(page, context, "/clientes?modal=novo");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Novo cliente" }).first()).toBeVisible();
    await expect(page).toHaveURL(/modal=novo/);
  });

  test("clientes: ?modal=novo abre por clique e fecha limpando a URL", async ({ context, page }) => {
    await openPage(page, context, "/clientes");

    // O App Router descarta silenciosamente o primeiro clique quando ele cai na
    // janela logo apos a hidratacao: o handler do next/link ja preveniu o default
    // mas o router ainda nao navega. Repetir o clique e a unica forma estavel de
    // testar a abertura; nao e especifico do modal, vale para qualquer link.
    await expect(async () => {
      await page.getByRole("link", { name: /novo cliente/i }).first().click();
      await expect(page).toHaveURL(/modal=novo/, { timeout: 1500 });
    }).toPass({ timeout: 15_000 });

    await expect(page.getByRole("dialog")).toBeVisible();

    // Re-clica apenas enquanto o botao existir. Se o dialogo ja fechou e a URL
    // continua suja, o problema e a navegacao de saida, nao o clique: seguir
    // clicando um elemento ausente mascararia isso como timeout do locator.
    await expect(async () => {
      const fechar = page.getByRole("button", { name: "Fechar" });
      if (await fechar.count()) await fechar.click();
      await expect(page).not.toHaveURL(/modal=novo/, { timeout: 1500 });
    }).toPass({ timeout: 15_000 });

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("clientes: ?edit=<id> abre o modal de edicao", async ({ context, page }) => {
    await openPage(page, context, "/clientes");

    const editLink = page.locator('a[href*="edit="]').first();
    const href = await editLink.getAttribute("href");
    test.skip(!href, "sem clientes cadastrados no ambiente");

    await openPage(page, context, href);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading", { name: /editar cliente/i }).first()).toBeVisible();
  });

  test("clientes: /clientes/novo redireciona para o modal canonico", async ({ context, page }) => {
    await openPage(page, context, "/clientes/novo");

    await expect(page).toHaveURL(/\/clientes\?modal=novo/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("clientes: /clientes/<id>/editar redireciona para o modal canonico", async ({ context, page }) => {
    await openPage(page, context, "/clientes");

    const href = await page.locator('a[href*="edit="]').first().getAttribute("href");
    test.skip(!href, "sem clientes cadastrados no ambiente");

    const id = new URL(href, "http://127.0.0.1:3000").searchParams.get("edit");
    await openPage(page, context, `/clientes/${id}/editar`);

    await expect(page).toHaveURL(new RegExp(`/clientes\\?edit=${id}`));
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("fichas: ?print=<id> abre a previa de impressao", async ({ context, page }) => {
    await openPage(page, context, "/fichas");

    const printLink = page.locator('a[href*="print="]').first();
    const href = await printLink.getAttribute("href");
    test.skip(!href, "sem fichas cadastradas no ambiente");

    await openPage(page, context, href);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/print=/);
  });
});

test.describe("tokens e contraste", () => {
  test("nenhum token semantico fica indefinido", async ({ context, page }) => {
    await openPage(page, context, "/");

    const missing = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return [
        "--color-border-subtle",
        "--color-muted",
        "--color-focus-ring",
        "--color-primary-text",
        "--color-chart-1",
        "--color-chart-8",
        "--touch-target-min",
        "--font-size-meta",
      ].filter((token) => style.getPropertyValue(token).trim() === "");
    });

    expect(missing).toEqual([]);
  });

  test("texto secundario nao herda a cor do texto principal", async ({ context, page }) => {
    await openPage(page, context, "/meu-painel");

    const colors = await page.evaluate(() => ({
      main: getComputedStyle(document.querySelector("h1")).color,
      muted: getComputedStyle(document.querySelector(".eyebrow")).color,
    }));

    expect(colors.muted).not.toBe(colors.main);
  });
});

test.describe("reordenacao por teclado", () => {
  test("o handle de produto e um button e responde as setas", async ({ context, page }) => {
    await openPage(page, context, "/fichas/nova");

    const handle = page.locator("button.products-editor__drag").first();
    await expect(handle).toBeVisible();
    await waitForHandler(page, "button.products-editor__drag", "onKeyDown");
    await expect(handle).toHaveAttribute("aria-label", /Posição 1 de/);

    await page.getByRole("button", { name: /adicionar produto/i }).click();
    const rows = page.locator(".products-editor__row");
    await expect(rows).toHaveCount(2);

    await rows.first().locator('input[data-product-column="quantidade"]').fill("11");
    await rows.nth(1).locator('input[data-product-column="quantidade"]').fill("22");

    await page.locator("button.products-editor__drag").first().focus();
    await page.keyboard.press("ArrowDown");

    await expect(page.locator(".products-editor__row").first().locator('input[data-product-column="quantidade"]')).toHaveValue("22");
    await expect(page.locator("button.products-editor__drag").nth(1)).toBeFocused();
  });
});

test.describe("graficos acessiveis", () => {
  test("os graficos de /meu-painel expoem tabela alternativa", async ({ context, page }) => {
    await openPage(page, context, "/meu-painel");

    const frames = page.locator("figure.ui-chart-frame");
    const total = await frames.count();
    test.skip(total === 0, "sem graficos no dataset atual");

    for (let index = 0; index < total; index += 1) {
      const frame = frames.nth(index);
      await expect(frame.locator(".ui-chart-frame__canvas")).toHaveAttribute("aria-hidden", "true");
      await expect(frame.locator("table.sr-only, figcaption.sr-only")).toHaveCount(1);
    }
  });
});

test.describe("estrutura de pagina", () => {
  const routes = [
    { path: "/", title: /Fichas Tecnicas/ },
    { path: "/fichas", title: /Fichas/ },
    { path: "/clientes", title: /Clientes/ },
    { path: "/relatorios", title: /Relat/ },
    { path: "/ferramentas", title: /Ferramentas/ },
    { path: "/meu-painel", title: /Meu perfil/ },
    { path: "/quadro-producao", title: /Quadro|Fichas/ },
    { path: "/ferramentas/organizar-nomes-ia", title: /Organizar nomes/ },
    { path: "/ferramentas/plano-de-corte", title: /Plano de Corte/ },
    { path: "/design-system", title: /Design system/ },
  ];

  for (const route of routes) {
    test(`${route.path} tem exatamente um h1 e title proprio`, async ({ context, page }) => {
      await openPage(page, context, route.path);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(route.title);
    });
  }
});

test.describe("plano de corte: tamanhos e mangas", () => {
  test("cada linha escolhe manga curta ou longa", async ({ context, page }) => {
    await openPage(page, context, "/ferramentas/plano-de-corte");
    const fabric = page.locator('input[id^="cut-plan-fabric-name-"]').first();
    await expect(fabric).toHaveAttribute("role", "combobox");
    await expect(fabric).toHaveValue("Malha Fria (PV)");
    await fabric.fill("Poliviscose");
    const fabricOption = page.getByRole("option").filter({ hasText: "Malha Fria (PV)" }).first();
    await expect(fabricOption).toContainText("118 cm");
    await expect(fabricOption).toContainText("Tubular");
    await fabricOption.click();
    await expect(fabric).toHaveValue("Malha Fria (PV)");
    await expect(page.locator('input[id^="cut-plan-fabric-width-"]').first()).toHaveValue("118");
    await expect(page.locator('select[id^="cut-plan-fabric-type-"]').first()).toHaveValue("TUBULAR");
    await page.locator('input[id^="cut-plan-fabric-color-"]').first().fill("Azul");
    await expect(page.locator(".cut-plan__fabric-title strong").first()).toHaveText("Malha Fria (PV) — Azul");

    await page.getByRole("button", { name: /adicionar tamanho/i }).click();

    const sleeve = page.getByLabel("Manga da linha 1");
    await expect(sleeve).toBeVisible();
    await expect(sleeve.locator("option")).toHaveText(["Curta", "Longa"]);
    await sleeve.selectOption("LONGA");
    await expect(sleeve).toHaveValue("LONGA");
    const overflow = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
  });

  test("a busca de ficha preenche o tipo de manga nas linhas importadas", async ({ context, page }) => {
    await openPage(page, context, "/ferramentas/plano-de-corte");
    const response = await page.request.get("/api/ferramentas/plano-de-corte/fichas");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const ficha = payload.fichas?.find((candidate) => candidate.material?.trim() && candidate.items?.length);
    test.skip(!ficha, "sem ficha com tecido e tamanhos no ambiente");

    const search = page.getByLabel("Pesquisar ficha");
    await search.fill(ficha.number || ficha.client);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page.getByRole("option").filter({ hasText: ficha.client }).first().click();

    await expect(page.locator(".cut-plan-fichas__added")).toContainText(ficha.sleeveType === "LONGA" ? "Manga longa" : "Manga curta");
    await expect(page.locator('input[id^="cut-plan-fabric-name-"]').first()).toHaveValue(ficha.material);
    await expect(page.locator(".cut-plan__fabric-title strong").first()).toHaveText(ficha.color ? `${ficha.material} — ${ficha.color}` : ficha.material);
    const sleeves = page.locator('select[aria-label^="Manga da linha"]');
    await expect(sleeves).toHaveCount(ficha.items.length);
    for (const select of await sleeves.all()) await expect(select).toHaveValue(ficha.sleeveType);
  });

  test("a importação resolve alias para o tecido canônico e seus dados de corte", async ({ context, page }) => {
    await openPage(page, context, "/ferramentas/plano-de-corte");
    const ficha = {
      client: "Cliente legado",
      color: "Azul",
      id: "legacy-alias",
      imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect width='80' height='60' fill='%23dbeafe'/%3E%3C/svg%3E",
      items: [{ quantity: 10, size: "M" }],
      material: "Poliviscose",
      number: "LEG-1",
      sleeveType: "CURTA",
      total: 10,
    };
    await page.route("**/api/ferramentas/plano-de-corte/fichas**", async (route) => {
      const isSingle = new URL(route.request().url()).searchParams.has("fichaId");
      await route.fulfill({ contentType: "application/json", json: isSingle ? { success: true, ficha } : { success: true, fichas: [ficha] } });
    });

    await page.getByLabel("Pesquisar ficha").fill("Cliente legado");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page.getByRole("option").filter({ hasText: "Cliente legado" }).click();

    await expect(page.locator('input[id^="cut-plan-fabric-name-"]').first()).toHaveValue("Malha Fria (PV)");
    await expect(page.locator('input[id^="cut-plan-fabric-width-"]').first()).toHaveValue("118");
    await expect(page.locator('select[id^="cut-plan-fabric-type-"]').first()).toHaveValue("TUBULAR");
    await expect(page.locator(".cut-plan__fabric-title strong").first()).toHaveText("Malha Fria (PV) — Azul");
    await expect(page.getByRole("checkbox", { name: /Mesclar tecidos nos enfestos/ })).not.toBeChecked();
    await page.getByRole("button", { name: "Calcular plano" }).click();
    await expect(page.getByRole("heading", { name: "Resultado", exact: true })).toBeVisible();
    await page.evaluate(() => { window.print = () => {}; });
    await page.getByRole("button", { name: "Imprimir esta" }).click();
    const printSources = page.locator(".cut-plan-native-print-root .cut-plan-print-simple__sources");
    await expect(printSources).toContainText("Cliente legado");
    await expect(printSources).toContainText("Malha Fria (PV) · Azul · Manga curta · 10 peças");
    await expect(printSources.locator("img")).toHaveCount(1);
  });

  test("mescla três cores compatíveis no mesmo enfesto quando autorizado", async ({ context, page }) => {
    await openPage(page, context, "/ferramentas/plano-de-corte");
    const fichas = [
      { client: "Pedido preto", color: "Preto", id: "merge-black", quantity: 12 },
      { client: "Pedido branco", color: "Branco", id: "merge-white", quantity: 6 },
      { client: "Pedido azul", color: "Azul", id: "merge-blue", quantity: 6 },
    ].map(({ quantity, ...ficha }) => ({
      ...ficha,
      imageUrl: null,
      items: [{ quantity, size: "M" }],
      material: "Malha Fria (PV)",
      number: null,
      sleeveType: "CURTA",
      total: quantity,
    }));
    await page.route("**/api/ferramentas/plano-de-corte/fichas**", async (route) => {
      const id = new URL(route.request().url()).searchParams.get("fichaId");
      await route.fulfill({ contentType: "application/json", json: id ? { success: true, ficha: fichas.find((ficha) => ficha.id === id) } : { success: true, fichas } });
    });

    for (const ficha of fichas) {
      await page.getByRole("button", { name: "Buscar", exact: true }).click();
      await page.getByRole("option").filter({ hasText: ficha.client }).click();
      await expect(page.locator(".cut-plan-fichas__added > div")).toHaveCount(fichas.indexOf(ficha) + 1);
    }
    await page.getByRole("checkbox", { name: /Mesclar tecidos nos enfestos/ }).check();
    await page.getByRole("button", { name: "Calcular plano" }).click();

    await expect(page.locator(".cut-plan__tabs button").first()).toContainText("1 enfesto");
    await expect(page.getByRole("heading", { name: "Enfestos mesclados" })).toBeVisible();
    const mergedLay = page.locator(".cut-plan__lay").first();
    await expect(mergedLay).toContainText("Malha Fria (PV) — Preto");
    await expect(mergedLay).toContainText("4M");
    await expect(mergedLay).toContainText("Malha Fria (PV) — Branco");
    await expect(mergedLay).toContainText("Malha Fria (PV) — Azul");
    await expect(mergedLay.locator(".cut-plan__lay-layers > span")).toHaveText("3");
    await expect(page.locator(".cut-plan__check")).toHaveCount(3);
    await expect(page.locator(".cut-plan .is-changed")).toHaveCount(0);
  });

  test("resultado destaca folhas, omite ausência de estimativa e imprime no rodapé", async ({ context, page }) => {
    await openPage(page, context, "/ferramentas/plano-de-corte");
    await expect(page.getByRole("heading", { name: "Resultado", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /adicionar tamanho/i }).click();
    await page.getByLabel("Tamanho da linha 1").fill("P");
    await page.getByRole("button", { name: "Calcular plano" }).click();

    await expect(page.getByRole("heading", { name: "Resultado", exact: true })).toBeVisible();
    await expect(page.locator(".cut-plan__check").first()).toBeVisible();
    await expect(page.getByText("Sem estimativa dimensional")).toHaveCount(0);
    await expect(page.locator(".cut-plan__marker-length").first()).toHaveText(/^Comprimento estimado: \d+,\d metros$/);
    await expect(page.locator(".cut-plan__grade").first()).not.toContainText(/\bM[CL]\b/);
    const layCard = page.locator(".cut-plan__lay").first();
    await layCard.hover();
    await expect.poll(() => layCard.evaluate((element) => ({ shadow: getComputedStyle(element).boxShadow, transform: getComputedStyle(element).transform }))).not.toEqual({ shadow: "none", transform: "none" });
    const layers = page.locator(".cut-plan__lay-layers > span").first();
    await expect(layers).toBeVisible();
    const highlighted = await layers.evaluate((element) => {
      const probe = document.createElement("span");
      probe.style.background = "var(--color-primary-bg)";
      probe.style.color = "var(--color-primary-text)";
      document.body.append(probe);
      const expected = getComputedStyle(probe);
      const actual = getComputedStyle(element);
      const matches = actual.backgroundColor === expected.backgroundColor && actual.color === expected.color;
      probe.remove();
      return matches;
    });
    expect(highlighted).toBeTruthy();
    const actionsFollowCheck = await page.evaluate(() => {
      const checks = document.querySelectorAll(".cut-plan__check");
      const check = checks.item(checks.length - 1);
      const actions = document.querySelector(".cut-plan__print-actions--bottom");
      return Boolean(check && actions && (check.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(actionsFollowCheck).toBeTruthy();
    const printButton = page.getByRole("button", { name: "Imprimir esta" });
    await expect(printButton).toBeVisible();
    await page.evaluate(() => { window.print = () => {}; });
    await printButton.click();
    const printRoot = page.locator(".cut-plan-native-print-root");
    await expect(printRoot).toHaveCount(1);
    await expect(printRoot).not.toContainText("FICHA PROD · SETOR DE CORTE");
    await expect(printRoot).not.toContainText("PRINCIPAL");
    await expect(printRoot).not.toContainText("Máx. por enfesto");
    await expect(printRoot).not.toContainText("Confira cada grade no Audaces antes de liberar o corte.");
    await expect(printRoot.locator(".cut-plan-print-simple__summary dt")).toHaveText(["Enfestos", "Total de folhas"]);
  });
});

test.describe("filtros com rotulo persistente", () => {
  test("/meu-painel: busca e status tem label associado", async ({ context, page }) => {
    await openPage(page, context, "/meu-painel");

    for (const id of ["painel-busca", "painel-status"]) {
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toHaveCount(1);
      await expect(label).not.toBeEmpty();
    }
  });
});

test.describe("tabelas responsivas", () => {
  test("/fichas usa modo card e /meu-painel mantem scroll", async ({ context, page }) => {
    await openPage(page, context, "/fichas");
    await expect(page.locator('.ui-table-wrap[data-responsive="cards"]').first()).toHaveCount(1);

    await openPage(page, context, "/meu-painel");
    const wrap = page.locator(".ui-table-wrap").first();
    if (await wrap.count()) {
      await expect(wrap).toHaveAttribute("data-responsive", "scroll");
    }
  });

  test("nenhuma rota principal gera scroll horizontal", async ({ context, page }) => {
    for (const path of ["/", "/fichas", "/clientes", "/relatorios", "/quadro-producao", "/meu-painel"]) {
      await openPage(page, context, path);
      const overflow = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(overflow.scroll, `overflow horizontal em ${path}`).toBeLessThanOrEqual(overflow.client + 1);
    }
  });
});

test.describe("breakpoints consolidados", () => {
  // `/ferramentas/plano-de-corte` carrega folha propria pelo layout da rota:
  // sem visitar a rota, os cortes dela nao entram em `document.styleSheets`.
  for (const rota of ["/", "/ferramentas/plano-de-corte"]) {
  test(`o CSS usa apenas os quatro cortes oficiais em ${rota}`, async ({ context, page }) => {
    await openPage(page, context, rota);

    const cortes = await page.evaluate(() => {
      const larguras = new Set();
      for (const folha of Array.from(document.styleSheets)) {
        let regras;
        try {
          regras = folha.cssRules;
        } catch {
          continue;
        }
        for (const regra of Array.from(regras ?? [])) {
          if (regra.type !== CSSRule.MEDIA_RULE) continue;
          // react-day-picker e sonner trazem os proprios cortes; so o CSS do projeto conta.
          const vendor = /^(\.rdp|\[data-sonner)/;
          const proprio = Array.from(regra.cssRules ?? []).some(
            (interna) => interna.selectorText && !interna.selectorText.split(",").every((s) => vendor.test(s.trim())),
          );
          if (!proprio) continue;
          for (const m of regra.conditionText.matchAll(/(?:max|min)-width:\s*(\d+)px/g)) {
            larguras.add(Number(m[1]));
          }
        }
      }
      return [...larguras].sort((a, b) => a - b);
    });

    // 1025 e o complemento de min-width do corte lg.
    const permitidos = new Set([480, 768, 1024, 1025, 1280]);
    expect(cortes.filter((c) => !permitidos.has(c))).toEqual([]);
  });
  }
});

test.describe("combobox", () => {
  test("as opcoes nao entram na ordem de Tab", async ({ context, page }) => {
    await openPage(page, context, "/fichas/nova");

    const input = page.locator(".custom-datalist input").first();
    await waitForHandler(page, ".custom-datalist input", "onFocus");
    await input.click();

    const options = page.locator('.custom-datalist [role="option"]');
    await expect(options.first()).toBeVisible();
    await expect(options.first()).toHaveAttribute("tabindex", "-1");
    await expect(input).toHaveAttribute("aria-expanded", "true");
  });
});
