// Shared ESLint base config (flat config, ESLint 8 and 9 compatible).
// Uses only typescript-eslint (self-contained recommended set) so the
// config works with the ESLint 8 used by eslint-config-next and the
// ESLint 9 used by the packages.
import tseslint from "typescript-eslint";

export const baseConfig = tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);

export default baseConfig;
