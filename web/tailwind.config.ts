import type { Config } from 'tailwindcss';

// Tailwind v4 CSS-first config lives in globals.css (@theme). This file only
// sets content globs via the PostCSS plugin defaults; kept for explicitness.
const config = {
  content: ['./src/**/*.{ts,tsx}'],
} satisfies Config;

export default config;
