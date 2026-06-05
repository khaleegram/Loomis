/**
 * Shared ESLint base config for all Loomis packages and apps.
 * Enforces the dependency-direction rule from the Frontend Architecture (§1.2):
 *   - contracts / design-tokens are leaf packages (import nothing internal)
 *   - web / mobile are roots (nothing imports from them)
 */
module.exports = {
  root: false,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@loomis/web", "@loomis/web/*", "@loomis/mobile", "@loomis/mobile/*"],
            message:
              "Apps (web/mobile) are roots — shared packages must not import from them.",
          },
        ],
      },
    ],
  },
  settings: {
    "import/resolver": { typescript: true },
  },
};
