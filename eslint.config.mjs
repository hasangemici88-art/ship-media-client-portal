import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: currentDir,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
