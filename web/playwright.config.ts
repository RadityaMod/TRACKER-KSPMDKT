import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3101",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- -p 3101",
    url: "http://localhost:3101/pin",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DASHBOARD_PIN: "24681012",
      DASHBOARD_PIN_SECRET: "e2e-secret-separate-from-pin",
      SHEET_ID: "",
      SHEET_RANGE: "",
      GOOGLE_SERVICE_ACCOUNT_JSON: "",
      ALLOW_LOCAL_FALLBACK: "false",
      PLAYWRIGHT_TEST: "1",
    },
  },
});