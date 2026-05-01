import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "server.js",
    "playwright.config.js",
    "tests/**",
    "public/**",
    "src/config/**",
    "src/controllers/**",
    "src/middlewares/**",
    "src/repositories/**",
    "src/routes/**",
    "src/services/**",
    "src/utils/**",
    "src/validators/**",
  ]),
]);
