// Shared ESLint config for the NestJS backend.
import { baseConfig } from "./base.js";

export const nestConfig = [
  ...baseConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default nestConfig;
