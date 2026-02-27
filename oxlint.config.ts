import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import { defineConfig } from "oxlint";

export default defineConfig({
  overrides: [
    {
      files: ["**/*.{js,cjs,mjs,ts,tsx,cts,mts}"],
      jsPlugins: ["eslint-plugin-better-tailwindcss"],
      rules: {
        // enable all recommended rules
        ...eslintPluginBetterTailwindcss.configs.recommended.rules,

        // if needed, override rules to configure them individually
        "better-tailwindcss/enforce-consistent-line-wrapping": ["warn", { printWidth: 100 }],
      },
    },
  ],
  settings: {
    "better-tailwindcss": {
      entryPoint: "src/global.css",
    },
  },
});
