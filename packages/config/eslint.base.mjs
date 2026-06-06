// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * Shared ESLint flat config for all Loomis packages and apps (ESLint 9/10).
 *
 * Enforces the dependency-direction rule from the Frontend Architecture (§1.2):
 *   - web / mobile are roots — nothing internal may import from them.
 *   - contracts / design-tokens are leaf packages (import nothing internal).
 *
 * Exported as a flat-config array so the root `eslint.config.mjs` can spread it
 * and add repo-level `ignores`. Rules are NOT type-aware (no `project` needed),
 * matching the previous `@typescript-eslint/recommended` (non-type-checked) base
 * so linting stays fast and does not require a built tsconfig graph.
 */
export const loomisEslintBase = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@loomis/web', '@loomis/web/*', '@loomis/mobile', '@loomis/mobile/*'],
              message: 'Apps (web/mobile) are roots — shared packages must not import from them.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests and config files may use devtime globals and looser typing.
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.config.{ts,mjs,cjs,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);

export default loomisEslintBase;
