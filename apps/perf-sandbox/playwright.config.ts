// apps/perf-sandbox/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3400',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});