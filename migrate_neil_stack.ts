#!/usr/bin/env bun
// oxlint-disable no-console
import { $ } from "bun";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import oxfmtSettings from "./files/.oxfmtrc.json.txt" with { type: "text" };
import vscodeSettings from "./files/.vscode/settings.json.txt" with { type: "text" };
import biomeSettings from "./files/biome.json.txt" with { type: "text" };
import fmtFile from "./files/fmt.ts.txt" with { type: "text" };
import oxlintSettings from "./files/oxlint.config.ts.txt" with { type: "text" };
import resetDTS from "./files/reset.d.ts.txt" with { type: "text" };

// configure the default command so that we can define a positional argument
const argv = await yargs(hideBin(process.argv))
  // override the script name for help output
  .scriptName("migrate_neil_stack.js")
  .usage("Usage: $0 [dir]")
  .command(
    "$0 [dir]",
    "Migrate the project at the given path (defaults to cwd)",
    (y) =>
      y.positional("dir", {
        describe: "Absolute path to the project directory to migrate",
        type: "string",
      })
    // no handler, we just use argv after parsing
  )
  .example("$0 /home/user/myproject", "Migrate the project at the given path")
  .example("$0", "Migrate the current working directory")
  .help()
  .alias("h", "help")
  .version(false)
  .parse();

const targetDir = argv.dir as string | undefined;
if (targetDir) {
  try {
    process.chdir(targetDir);
    console.log(`Switched working directory to ${targetDir}`);
  } catch (err) {
    console.error(`Cannot change directory to ${targetDir}:`, err);
    process.exit(1);
  }
}

const start = Date.now();

// exit if there are any git changes (ignoring staged changes)
const filesChanged = Number(await $`git diff --numstat | wc -l`.text());
if (filesChanged > 0) {
  console.error(
    "Git working directory has uncommitted changes. Please commit or stash changes before running this script."
  );
  process.exit(1);
}

// oxlint-disable-next-line promise/prefer-await-to-then
const bunAddPromise = (async () => {
  try {
    await $`bun add -D @types/bun @total-typescript/ts-reset oxfmt oxlint oxlint-tsgolint husky lint-staged @biomejs/biome eslint-plugin-better-tailwindcss`;
  } catch (err) {
    console.error("Failed to add dependencies:", err);
    process.exit(1);
  }
})();

// read package.json and vscode settings concurrently
const [packageJsonText, vscodeText, turboJsonText] = await Promise.all([
  Bun.file("package.json")
    .text()
    .catch(() => {
      console.log("Bruhh");
      process.exit(1);
    }),
  Bun.file(".vscode/settings.json")
    .text()
    .catch((err) => {
      if ((err as ErrnoException).code === "ENOENT") {
        return "{}";
      }
      process.exit(1);
    }),
  Bun.file("turbo.json")
    .text()
    .catch(() => {
      console.log("Bruh you don't have turbo added. continuing without it");
    }),
]);

await $`rm -f .oxlintrc.json oxlint.config.ts`;

// package.json
const currentPackageJson = Bun.JSONC.parse(packageJsonText) as {
  scripts: Record<string, string>;
};
Object.assign(currentPackageJson.scripts, {
  fmt: "bun fmt.ts",
  lint: "bun run --parallel lint:oxlint lint:biome lint:oxfmt",
  "lint:biome": "biome check --diagnostic-level=error",
  "lint:oxfmt":
    "oxfmt --threads=2 --check || (echo '\n\n\nRun `bun fmt` to fix formatting issues!\n\n\n'; exit 1)",
  "lint:oxlint": "oxlint --threads=2 --type-aware --type-check --quiet",
  prepare: "husky",
  "update-deps": "bun update -i -r",
});
Object.assign(currentPackageJson, {
  "lint-staged": {
    "*.{ts,tsx,mts,js,jsx,mjs}": [
      "oxfmt",
      "biome lint --only=noUnusedImports --fix",
      "oxlint --threads=2 --type-aware --type-check --quiet",
      "biome check --diagnostic-level=error --no-errors-on-unmatched",
    ],
  },
});

// .vscode/settings.json
const vscodeSettingsJson = Bun.JSONC.parse(vscodeSettings);
const currentVscodeSettings = Bun.JSONC.parse(vscodeText) as {
  [key: string]: object;
};
Object.assign(currentVscodeSettings, vscodeSettingsJson);

// turbo.json
let currentTurboJson: { ui: string } | undefined;
if (turboJsonText) {
  currentTurboJson = Bun.JSONC.parse(turboJsonText) as { ui: string };
  currentTurboJson.ui = "stream";
}

await Promise.all([
  Bun.write("package.json", `${JSON.stringify(currentPackageJson, null, 2)}\n`),
  Bun.write(".oxfmtrc.json", oxfmtSettings),
  Bun.write("oxlint.config.ts", oxlintSettings),
  Bun.write(".vscode/settings.json", `${JSON.stringify(currentVscodeSettings, null, 2)}\n`),
  Bun.write("biome.json", biomeSettings),
  Bun.write("reset.d.ts", resetDTS),
  Bun.write("fmt.ts", fmtFile),
  currentTurboJson && Bun.write("turbo.json", `${JSON.stringify(currentTurboJson, null, 2)}\n`),
]);

await bunAddPromise;
await $`bun fmt`;
await $`bun lint`;

// requires user input so it goes last
await $`bun update-deps`;

const fin = Date.now() - start;
console.log(`Migration completed in ${fin}ms!`);
