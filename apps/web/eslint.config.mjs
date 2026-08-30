import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      // Ban explicit `any` in lib and utility layers.
      // Component JSX excluded initially to keep scope shippable.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/lib/**/*.ts", "src/app/utils/**/*.ts", "src/app/*-utils.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Allow `any` in test files within the scoped directories
  {
    files: ["src/lib/**/*.test.ts", "src/lib/**/*.test.tsx", "src/app/utils/**/*.test.ts", "src/app/utils/**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".tmp-test/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
