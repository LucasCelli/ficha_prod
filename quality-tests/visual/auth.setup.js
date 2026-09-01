import { expect, test as setup } from "@playwright/test";

const authFile = "test-results/.auth/user.json";
const superadminFile = "test-results/.auth/superadmin.json";

async function login(page, username, pin, file) {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(username);
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await page.context().storageState({ path: file });
}

setup("authenticate", async ({ page }) => {
  await login(page, process.env.E2E_USERNAME ?? "lucas", process.env.E2E_PIN ?? "4700", authFile);
});

// Conta separada porque `lucas` e Vendedor: /catalogos e /usuarios sao exclusivos de Admin.
setup("authenticate superadmin", async ({ page }) => {
  await login(page, process.env.E2E_SUPERADMIN_USERNAME ?? "nhx", process.env.E2E_SUPERADMIN_PIN ?? "756361", superadminFile);
});
