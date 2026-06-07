import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  // Skip the app's Tailwind v4 PostCSS pipeline during unit tests.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: [{ find: '@/', replacement: `${srcDir}/` }],
    // Workspace packages use ESM `.js` specifiers that point at `.ts` sources.
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
