import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./quality-tests/visual",
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.js/,
    },
    {
      name: "desktop-chromium",
      dependencies: ["setup"],
      testIgnore: /admin\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "test-results/.auth/user.json",
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      // Faixa 768-1024: e onde a tabela de fichas troca para cards e onde a
      // toolbar do quadro quebra. Sem este viewport, o corte `lg` nao tinha
      // nenhuma baseline cobrindo os dois lados da transicao.
      name: "tablet-chromium",
      dependencies: ["setup"],
      testIgnore: /admin\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "test-results/.auth/user.json",
        viewport: { height: 1000, width: 900 },
      },
    },
    {
      name: "mobile-chromium",
      dependencies: ["setup"],
      testIgnore: /admin\.spec\.js/,
      use: {
        ...devices["Pixel 5"],
        storageState: "test-results/.auth/user.json",
      },
    },
    {
      // Superficies restritas a superadmin. Sessao propria porque a conta usada
      // nos demais projetos e Vendedor e seria redirecionada para a home.
      name: "superadmin-chromium",
      dependencies: ["setup"],
      testMatch: /admin\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "test-results/.auth/superadmin.json",
        viewport: { height: 900, width: 1440 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_USE_RUNNING_SERVER
    ? undefined
    : {
        command: "npm run start",
        reuseExistingServer: true,
        timeout: 120_000,
        url: "http://127.0.0.1:3000",
      },
});
