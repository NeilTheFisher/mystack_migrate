import { $ } from "bun";

import oxfmtSettings from "./files/.oxfmtrc.json.txt" with { type: "text" };
import oxlintSettings from "./files/.oxlintrc.json.txt" with { type: "text" };
import vscodeSettings from "./files/.vscode/settings.json5";
import biomeSettings from "./files/biome.json.txt" with { type: "text" };
import fmtFile from "./files/fmt.ts.txt" with { type: "text" };
import resetDTS from "./files/reset.d.ts.txt" with { type: "text" };

// exit if there are any git changes (ignoring staged changes)
const filesChanged = Number(await $`git diff --numstat | wc -l`.text());
if (filesChanged > 0) {
  console.error(
    "Git working directory has uncommitted changes. Please commit or stash changes before running this script."
  );
  process.exit(1);
}

const bunAddPromise = $`bun add -D @types/bun @total-typescript/ts-reset oxlint-tsgolint`.catch(
  (err) => {
    console.error("Failed to add dependencies:", err);
    process.exit(1);
  }
);

// read package.json and vscode settings concurrently
const [packageJsonText, vscodeText] = await Promise.all([
  Bun.file("package.json")
    .text()
    .catch(() => {
      console.log("Bruh");
      process.exit(1);
    }),
  Bun.file(".vscode/settings.json")
    .text()
    .catch((err) => {
      if (err.code === "ENOENT") {
        return "{}";
      }
    }),
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

await Promise.all([bunAddPromise, $`bun fmt`]);

// requires user input so it goes last
await $`bun update-deps`;
