import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e', timeout: 30000, fullyParallel: false, workers: 2,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173', headless: true,
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {},
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 430, height: 820 }, isMobile: true, hasTouch: true } }],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npm run preview -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
})
