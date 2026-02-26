#!/usr/bin/env bun
// oxlint-disable no-console
import { $ } from "bun";

async function main() {
  const startingChangedFiles = Number(await $`git diff --name-only | wc -l`.text());
  const start = Date.now();
  const stdout = await $`bun x oxfmt | wc -l`.text();
  const n = stdout.trim();
  const fin = Date.now() - start;
  const newChangedFiles = Number(await $`git diff --name-only | wc -l`.text());
  const filesChanged = newChangedFiles - startingChangedFiles;
  console.log(
    `oxfmt formatted ${n} files in ${fin}ms. ${filesChanged === 0 ? "No" : filesChanged} fixes applied.`
  );

  await $`biome lint --fix`;
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
