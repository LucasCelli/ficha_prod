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
      use: {
        ...devices["Desktop Chrome"],
        storageState: "test-results/.auth/user.json",
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      name: "mobile-chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 5"],
        storageState: "test-results/.auth/user.json",
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
