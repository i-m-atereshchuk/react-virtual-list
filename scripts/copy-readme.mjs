import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * There's a single README at the repo root (so the GitHub repo page has
 * one), but `npm publish`/`pnpm pack` only ever pack files that live
 * inside the package directory being published -- they don't reach up to
 * the monorepo root. This copies the root README into the package
 * directory right before packing, so the npm package page still shows it.
 *
 * Runs as react-virtual-lite's own "prepack" script, so both `pnpm build`
 * and an actual `changeset publish` pick it up automatically (npm/pnpm
 * run a package's prepack script before packing it, no separate CI step
 * needed). The copy itself is gitignored -- it's a build artifact, not a
 * second source of truth.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const [, , targetPackageDir] = process.argv;

if (!targetPackageDir) {
  console.error("Usage: node scripts/copy-readme.mjs <package-dir>");
  process.exit(1);
}

const source = path.join(repoRoot, "README.md");
// targetPackageDir is resolved against the CURRENT WORKING DIRECTORY (where
// npm/pnpm invoked this script from -- the package being packed), not
// against repoRoot, so "." correctly means "the package that's running its
// prepack script", not "the repo root the README was just read from".
const destination = path.resolve(process.cwd(), targetPackageDir, "README.md");

fs.copyFileSync(source, destination);

console.log(
  `Copied ${path.relative(repoRoot, source)} -> ${path.relative(repoRoot, destination)}`,
);
