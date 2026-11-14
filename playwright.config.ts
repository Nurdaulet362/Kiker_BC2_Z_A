import { defineConfig, devices } from "@playwright/test";
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: {
    baseURL: externalBaseURL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL },
    },
    ...(process.env.PW_ALL_BROWSERS === "1" ? [
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ] : []),
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npm run dev -- --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
});
