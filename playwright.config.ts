import { defineConfig, devices } from "@playwright/test"

const port = process.env.PLAYWRIGHT_PORT ?? "3000"
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
  },
})
