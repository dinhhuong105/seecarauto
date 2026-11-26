// Shared ESLint config for Next.js apps (frontend / admin).
import nextPlugin from "eslint-config-next";
import { baseConfig } from "./base.js";

export const nextConfig = [...baseConfig, ...nextPlugin];

export default nextConfig;
