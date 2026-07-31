import { expect, test } from "@playwright/test";

test.describe("impressao de ficha", () => {
  test("abre a previa e gera o PDF sem erro de runtime", async ({ page }) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    await page.addInitScript(() => {
      window.print = () => {
        window.__fichaPrintCalled = true;
      };
    });

    await page.goto("/fichas");
    const previewLink = page.locator('a[href*="?print="]').first();
    await expect(previewLink).toBeVisible();
    const previewHref = await previewLink.getAttribute("href");
    expect(previewHref).toBeTruthy();
    await page.goto(previewHref);
    await expect(page).toHaveURL(/[?&]print=/);

    const preview = page.locator(".ficha-print-preview");
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#print-version > .print-page")).toBeVisible();

    await preview.getByRole("button", { name: "Imprimir ficha" }).click();
    await expect(page.getByText("Impressão pronta")).toBeVisible({ timeout: 30_000 });
    expect(runtimeErrors).toEqual([]);
  });

  test("imprime diretamente pelo botão de ações", async ({ page }) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    await page.addInitScript(() => {
      window.print = () => {
        window.__fichaPrintCalled = true;
      };
    });

    await page.goto("/fichas");
    const printButton = page.getByRole("button", { name: /^Imprimir ficha / }).first();
    await expect(printButton).toBeVisible();
    await printButton.click();

    await expect(page.getByText("Impressão pronta")).toBeVisible({ timeout: 30_000 });
    await expect(printButton).toBeEnabled();
    expect(runtimeErrors).toEqual([]);
  });
});
