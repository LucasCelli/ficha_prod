import { expect, test } from "@playwright/test";

test("plano de corte preserva os IDs do servidor durante a hidratação", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/ferramentas/plano-de-corte");
  const html = await response.text();
  const serverId = html.match(/id="(cut-plan-fabric-name-[^"]+)"/)?.[1];
  expect(serverId).toBeTruthy();
  await page.getByRole("button", { name: /adicionar tecido/i }).click();
  const names = page.getByRole("combobox", { name: "Tecido", exact: true });
  await expect(names).toHaveCount(2);
  await expect(names.first()).toHaveAttribute("id", serverId);
  expect(await names.nth(1).getAttribute("id")).not.toBe(serverId);
  await page.getByRole("button", { name: /adicionar tamanho/i }).click();
  await expect(page.getByLabel("Tamanho da linha 1", { exact: true })).toBeVisible();
  const itemType = page.getByLabel("Modelagem da linha 1", { exact: true });
  await expect(itemType.locator("option")).toHaveText(["Camiseta · manga curta", "Camiseta · manga longa", "Camisa social · manga curta", "Camisa social · manga longa", "Short/Bermuda", "Calça"]);
  // Confere também o estado usado pelo cliente, mesmo se React mantiver o atributo SSR.
  await expect(page.getByLabel("Tecido da linha 1", { exact: true })).toHaveValue(serverId.replace("cut-plan-fabric-name-", ""));
  expect(errors).toEqual([]);
});

async function prepare(page, entries) {
  await page.goto("/ferramentas/plano-de-corte");
  await page.waitForFunction(() => {
    const element = document.querySelector(".cut-plan");
    return element && Object.keys(element).some((key) => key.startsWith("__reactFiber"));
  });
  for (let i = 0; i < entries.length; i++) {
    await page.getByRole("button", { name: /adicionar tamanho/i }).click();
    await page.getByLabel(`Tamanho da linha ${i + 1}`, { exact: true }).fill(entries[i][0]);
    await page.getByLabel(`Quantidade da linha ${i + 1}`, { exact: true }).fill(String(entries[i][1]));
    await page.getByLabel(`Quantidade da linha ${i + 1}`, { exact: true }).press("Tab");
  }
}

test("plano de corte calcula no worker real e apresenta a conferência", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await prepare(page, [["M", 12], ["G", 8]]);
  const worker = page.waitForEvent("worker");
  await page.getByRole("button", { name: "Calcular plano", exact: true }).click();
  await worker;
  await expect(page.locator(".cut-plan__check")).toBeVisible({ timeout: 35_000 });
  await expect(page.getByRole("button", { name: "Calcular plano", exact: true })).toBeEnabled({ timeout: 35_000 });
  await expect(page.locator(".cut-plan__check tfoot")).toContainText("20");
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("plano de corte permite encerrar com resultado e invalida o worker ao editar", async ({ page }) => {
  await prepare(page, [6, 14, 16, 8, 6, 4, 4, 6, 4, 10, 10, 12, 6].map((quantity, index) => [`TESTE ${index}`, quantity]));
  await page.getByRole("button", { name: "Calcular plano", exact: true }).click();
  await expect(page.locator(".cut-plan__check")).toBeVisible();
  await page.getByRole("button", { name: "Usar melhor resultado" }).click();
  await expect(page.getByRole("button", { name: "Calcular plano", exact: true })).toBeEnabled();
  await expect(page.locator(".cut-plan__check")).toBeVisible();
  await page.getByRole("button", { name: "Calcular plano", exact: true }).click();
  await expect(page.getByRole("button", { name: "Usar melhor resultado" })).toBeVisible();
  await page.getByLabel("Tamanho da mesa", { exact: true }).fill("900");
  await expect(page.getByRole("button", { name: "Calcular plano", exact: true })).toBeEnabled();
  await expect(page.locator(".cut-plan__check")).toHaveCount(0);
});

test("plano de corte encerra pelo watchdog preservando a conferência", async ({ page }) => {
  await prepare(page, [6, 14, 16, 8, 6, 4, 4, 6, 4, 10, 10, 12, 6].map((quantity, index) => [`TESTE ${index}`, quantity]));
  await page.clock.install();
  await page.getByRole("button", { name: "Calcular plano", exact: true }).click();
  await expect(page.locator(".cut-plan__check")).toBeVisible();
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("button", { name: "Calcular plano", exact: true })).toBeEnabled();
  await expect(page.locator(".cut-plan__check")).toBeVisible();
  await expect(page.locator(".cut-plan__alternative-description")).toContainText("Prazo de busca atingido");
});
