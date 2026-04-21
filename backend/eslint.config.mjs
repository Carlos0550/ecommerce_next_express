import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import promisePlugin from "eslint-plugin-promise";
import nPlugin from "eslint-plugin-n";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "logs/**", "uploads/**", "scripts/**", "*.config.*", "check-business.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      promise: promisePlugin,
      n: nPlugin,
    },
    rules: {
      // Type safety — legacy `any` usage is being phased out module-by-module;
      // demoted to warn so the whole tree doesn't gate on pending refactors.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_|^err$|^error$",
        },
      ],

      // Async correctness
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "warn",
      // Common Express pattern: passing controller methods as handlers.
      "@typescript-eslint/unbound-method": "warn",

      // Console: only warn/error allowed (config/bootstrap); services deben usar logger
      "no-console": ["error", { allow: ["warn", "error"] }],

      // General hygiene
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-throw-literal": "error",
      "no-return-await": "warn",
      "no-promise-executor-return": "error",
      // Stylistic — many legacy occurrences, refactored opportunistically.
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/prefer-for-of": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "no-empty": "warn",
      "@typescript-eslint/no-require-imports": "warn",

      // Overridden later in config-only files
    },
  },
  {
    // Config/bootstrap files: allow console
    files: ["src/config/**/*.ts", "src/server.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // WhatsApp module: refactor out of scope for this cleanup (per plan);
    // its operational logs use console directly for now.
    files: ["src/modules/WhatsApp/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-misused-promises": "warn",
    },
  },
  prettierConfig
);
