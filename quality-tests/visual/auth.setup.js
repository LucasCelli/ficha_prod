import { expect, test as setup } from "@playwright/test";

const authFile = "test-results/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(process.env.E2E_USERNAME ?? "lucas");
  await page.getByLabel("PIN").fill(process.env.E2E_PIN ?? "4700");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await page.context().storageState({ path: authFile });
});
