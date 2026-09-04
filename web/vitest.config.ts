import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Unit-test config for the Truck Buddy web app.
 *
 * Scope: the unit-testable layer — pure logic (src/lib) and shared client UI
 * (src/components). Server pages/routes (src/app) are covered by e2e, not unit
 * tests, so they're intentionally outside this coverage boundary.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 50,
        functions: 45,
        branches: 40,
        lines: 50,
      },
    },
  },
});
