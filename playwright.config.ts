import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 430, height: 900 },
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
  },
});
