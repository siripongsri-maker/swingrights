import { defineConfig } from '@playwright/test';

/**
 * E2E tests (Playwright). The Vite dev server must be running
 * (default http://localhost:8080 — override with BASE_URL).
 *
 * Run: bunx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    headless: true,
    viewport: { width: 1280, height: 1800 },
    locale: 'th-TH',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
