import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: [
      "src/app/(school)/school/timetable/**/*.tsx",
      "src/app/(school)/school/assignments/**/*.tsx",
      "src/app/(school)/school/workflows/**/*.tsx",
      "src/app/(school)/school/sessions/promotions/**/*.tsx",
      "src/app/(school)/school/finance/reconciliation/**/*.tsx",
      "src/app/(school)/school/comms/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
