import { $ } from "bun";

import oxfmtSettings from "./files/.oxfmtrc.json.txt" with { type: "text" };
import oxlintSettings from "./files/.oxlintrc.json.txt" with { type: "text" };
import vscodeSettings from "./files/.vscode/settings.json";
import biomeSettings from "./files/biome.json.txt" with { type: "text" };
import fmtFile from "./files/fmt.ts.txt" with { type: "text" };
import resetDTS from "./files/reset.d.ts.txt" with { type: "text" };

await $`bun add -D @types/bun @total-typescript/ts-reset oxlint-tsgolint`;

// read package.json and vscode settings concurrently
const [packageJsonText, vscodeText] = await Promise.all([
  Bun.file("package.json").text(),
  Bun.file(".vscode/settings.json").text(),
]);

const currentPackageJson = JSON.parse(packageJsonText) as {
  scripts: Record<string, string>;
};
Object.assign(currentPackageJson.scripts, {
  fmt: "bun fmt.ts",
  lint: "turbo lint:oxlint lint:biome lint:oxfmt",
  "lint:biome": "biome check --diagnostic-level=error",
  "lint:oxfmt":
    "oxfmt --threads=2 --check || (echo '\n\n\nRun `bun fmt` to fix formatting issues!\n\n\n'; exit 1)",
  "lint:oxlint": "oxlint --threads=2 --type-aware --type-check --quiet",
  prepare: "husky",
  "update-deps": "bun update -i -r",
});

const currentVscodeSettings = JSON.parse(vscodeText) as {
  [key: string]: object;
};
Object.assign(currentVscodeSettings, vscodeSettings);

// perform all writes in parallel
await Promise.all([
  Bun.write("package.json", `${JSON.stringify(currentPackageJson, null, 2)}\n`),
  Bun.write(".oxfmtrc.json", oxfmtSettings),
  Bun.write(".oxlintrc.json", oxlintSettings),
  Bun.write(".vscode/settings.json", `${JSON.stringify(currentVscodeSettings, null, 2)}\n`),
  Bun.write("biome.json", biomeSettings),
  Bun.write("reset.d.ts", resetDTS),
  Bun.write("fmt.ts", fmtFile),
]);

await $`bun fmt`;

// requires user input so it goes last
await $`bun update-deps`;
