// Flat ESLint config for @seecarauto/shared (ESLint 9).
import { baseConfig } from "@seecarauto/eslint-config/base.js";

export default [
  ...baseConfig,
  { ignores: ["dist/**", "node_modules/**"] },
];
