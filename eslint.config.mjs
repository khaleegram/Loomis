// @ts-check
import { loomisEslintBase } from './packages/config/eslint.base.mjs';

/**
 * Root ESLint flat config. ESLint searches ancestor directories for this file,
 * so every workspace package's `eslint src` (run from the package dir) resolves
 * it here — one source of truth for the whole monorepo.
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/drizzle/migrations/**',
    ],
  },
  ...loomisEslintBase,
  {
    files: ['packages/api-client/src/query/hooks/timetable.ts', 'packages/api-client/src/query/hooks/comms.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
