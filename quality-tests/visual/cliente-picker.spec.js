import { expect, test } from "@playwright/test";

test("pesquisa textual não vira identidade e cancelar preserva a ficha", async ({ page }) => {
  await page.goto("/fichas/nova");
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);

  const primaryRow = page.locator(".ficha-customer-primary-row");
  await expect(primaryRow).toBeVisible();
  const fields = primaryRow.locator(":scope > .field");
  if ((page.viewportSize()?.width ?? 0) > 900) {
    const [clienteBox, aliasBox, vendedorBox] = await Promise.all([
      fields.nth(0).boundingBox(),
      fields.nth(1).boundingBox(),
      fields.nth(2).boundingBox(),
    ]);
    expect(clienteBox.width / aliasBox.width).toBeGreaterThan(1.9);
    expect(Math.abs(aliasBox.width - vendedorBox.width)).toBeLessThan(2);
  }

  const input = page.locator("#cliente");
  await input.click();
  await expect(page.getByRole("listbox")).toBeVisible();

  await input.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await input.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();

  await input.fill("Cliente ainda não cadastrado");
  await expect(page.locator('input[name="cliente"]')).toHaveValue("Cliente ainda não cadastrado");
  await expect(page.locator('input[name="clienteId"]')).toHaveValue("");

  await input.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();

  await page.getByRole("button", { name: "Novo Cliente" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const form = dialog.locator(".cliente-inline-form");
  const [headingBox, closeBox, padding] = await Promise.all([
    form.getByRole("heading", { name: "Novo cliente" }).boundingBox(),
    dialog.getByRole("button", { name: "Fechar" }).boundingBox(),
    form.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        bottom: Number.parseFloat(style.paddingBottom),
        left: Number.parseFloat(style.paddingLeft),
        right: Number.parseFloat(style.paddingRight),
        top: Number.parseFloat(style.paddingTop),
      };
    }),
  ]);
  expect(padding.left).toBeGreaterThanOrEqual(20);
  expect(padding.right).toBeGreaterThanOrEqual(20);
  expect(padding.top).toBeGreaterThanOrEqual(20);
  expect(padding.bottom).toBeGreaterThanOrEqual(20);
  expect(headingBox.x + headingBox.width).toBeLessThan(closeBox.x);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(input).toHaveValue("Cliente ainda não cadastrado");
  await expect(page.locator('input[name="clienteId"]')).toHaveValue("");
});
