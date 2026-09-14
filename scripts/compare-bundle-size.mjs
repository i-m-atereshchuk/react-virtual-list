import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [baseDirArg, currentDirArg] = process.argv.slice(2);

if (!baseDirArg || !currentDirArg) {
  console.error(
    "Usage: node scripts/compare-bundle-size.mjs <base-dist> <current-dist>",
  );

  console.error(
    "Example: node scripts/compare-bundle-size.mjs " +
      "../main/packages/react-virtual-lite/dist " +
      "packages/react-virtual-lite/dist",
  );

  process.exit(1);
}

const baseDir = path.resolve(baseDirArg);
const currentDir = path.resolve(currentDirArg);

/*
 * Unlike the runtime benchmarks (scripts/compare-benchmarks.mjs), a
 * minified bundle's byte count is fully deterministic for a given
 * source + lockfile -- there's no CI-runner noise to filter here, so
 * a much tighter threshold is appropriate. gzip size is what's
 * actually transferred over the wire, so it's the metric CI gates on;
 * raw minified size is reported alongside for context.
 */
const WARNING_THRESHOLD = 1;
const FAILURE_THRESHOLD = 5;

/*
 * Below this absolute gzip-byte difference, a percentage change is
 * ignored entirely -- e.g. a 4-byte diff on a ~50-byte type-only file
 * can read as a large percentage while being noise from gzip header
 * bytes, not a real content change.
 */
const MIN_BYTES_TO_FLAG = 50;

// Every published entry file worth tracking. "index.mjs" is what
// tree-shaking bundlers (Vite, Webpack 5+, esbuild) actually pull in
// via the "import"/"module" condition, so it's the one CI gates on;
// "index.cjs" is reported for visibility but never blocks.
const FILES = [
  { name: "index.mjs", gates: true },
  { name: "index.cjs", gates: false },
];

function readFile(directory, name) {
  const file = path.join(directory, name);

  if (!fs.existsSync(file)) {
    return null;
  }

  return fs.readFileSync(file);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function percentChange(base, current) {
  if (base === 0) {
    return current === 0 ? 0 : Infinity;
  }

  return ((current - base) / base) * 100;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "∞";
  }

  return `${value.toFixed(2)}%`;
}

function formatChange(value) {
  if (value === null) {
    return "N/A";
  }

  if (!Number.isFinite(value)) {
    return "🔴 +∞";
  }

  if (Math.abs(value) < 0.01) {
    return `➖ ${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `🟢 ${value.toFixed(2)}%`;
  }

  return `🔴 +${value.toFixed(2)}%`;
}

assertDirectory(baseDir, "Base");
assertDirectory(currentDir, "Current");

function assertDirectory(directory, label) {
  if (!fs.existsSync(directory)) {
    console.error(`${label} dist directory does not exist:`);
    console.error(directory);

    process.exit(1);
  }
}

const rows = [];

for (const { name, gates } of FILES) {
  const baseContent = readFile(baseDir, name);
  const currentContent = readFile(currentDir, name);

  if (baseContent === null && currentContent === null) {
    continue;
  }

  const baseRaw = baseContent?.length;
  const currentRaw = currentContent?.length;
  const baseGzip = baseContent ? zlib.gzipSync(baseContent).length : undefined;
  const currentGzip = currentContent
    ? zlib.gzipSync(currentContent).length
    : undefined;

  rows.push({
    name,
    gates,
    baseRaw,
    currentRaw,
    baseGzip,
    currentGzip,
    rawChange:
      baseRaw === undefined || currentRaw === undefined
        ? null
        : percentChange(baseRaw, currentRaw),
    gzipChange:
      baseGzip === undefined || currentGzip === undefined
        ? null
        : percentChange(baseGzip, currentGzip),
  });
}

if (rows.length === 0) {
  console.log("No dist files found in either directory.");
  process.exit(0);
}

let markdown = `# 📦 react-virtual-lite bundle size

Compared with \`main\`.

| File | Metric | main | PR | Change |
|---|---|---:|---:|---:|
`;

for (const row of rows) {
  markdown +=
    `| ${row.name} | Minified ` +
    `| ${row.baseRaw === undefined ? "N/A" : formatBytes(row.baseRaw)} ` +
    `| ${row.currentRaw === undefined ? "N/A" : formatBytes(row.currentRaw)} ` +
    `| ${formatChange(row.rawChange)} |\n`;

  markdown +=
    `| ${row.name} | Gzip ` +
    `| ${row.baseGzip === undefined ? "N/A" : formatBytes(row.baseGzip)} ` +
    `| ${row.currentGzip === undefined ? "N/A" : formatBytes(row.currentGzip)} ` +
    `| ${formatChange(row.gzipChange)} |\n`;
}

/*
 * Only a file's own gzip size counts as signal -- it's what actually
 * ships to consumers. A file that's new on one side (e.g. a CJS
 * build that didn't previously exist) has change=null and is
 * reported separately below rather than as a Regression/Improvement.
 */
const comparableRows = rows.filter((row) => {
  if (row.gzipChange === null) {
    return false;
  }

  const absoluteDiff = Math.abs((row.currentGzip ?? 0) - (row.baseGzip ?? 0));

  return absoluteDiff >= MIN_BYTES_TO_FLAG;
});

const regressions = comparableRows.filter(
  (row) => row.gzipChange >= WARNING_THRESHOLD,
);

const improvements = comparableRows.filter(
  (row) => row.gzipChange <= -WARNING_THRESHOLD,
);

const blockingRegressions = comparableRows.filter(
  (row) => row.gates && row.gzipChange >= FAILURE_THRESHOLD,
);

const newOrRemovedFiles = rows.filter((row) => row.gzipChange === null);

markdown += "\n";

if (regressions.length > 0) {
  markdown += "## ⚠️ Size increases\n\n";

  for (const row of regressions) {
    markdown += `- **${row.name} (gzip)**: +${formatPercent(row.gzipChange)}\n`;

    if (!row.gates || row.gzipChange < FAILURE_THRESHOLD) {
      console.log(
        `::warning::${row.name} gzip size grew by ` +
          `+${formatPercent(row.gzipChange)} (main=${formatBytes(row.baseGzip)}, ` +
          `PR=${formatBytes(row.currentGzip)})`,
      );
    }
  }
} else {
  markdown += "## ✅ No significant size increase\n\n";
}

if (improvements.length > 0) {
  markdown += "## 🚀 Size decreases\n\n";

  for (const row of improvements) {
    markdown += `- **${row.name} (gzip)**: ${formatPercent(row.gzipChange)}\n`;
  }
}

if (newOrRemovedFiles.length > 0) {
  markdown += "\n## ℹ️ Only present on one side\n\n";

  for (const row of newOrRemovedFiles) {
    markdown +=
      `- **${row.name}**: main=` +
      `${row.baseGzip === undefined ? "N/A" : formatBytes(row.baseGzip)}, ` +
      `PR=${row.currentGzip === undefined ? "N/A" : formatBytes(row.currentGzip)} ` +
      `(gzip)\n`;
  }
}

markdown += "\n---\n\n";

markdown +=
  `Size warning threshold: **+${WARNING_THRESHOLD}%** gzip.  \n` +
  `CI failure threshold: **+${FAILURE_THRESHOLD}%** gzip, on \`index.mjs\` only ` +
  `(the entry tree-shaking bundlers actually use). \`index.cjs\` is reported ` +
  `for visibility but never blocks. Diffs under ${MIN_BYTES_TO_FLAG} gzip bytes ` +
  `are ignored as noise.\n`;

console.log(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}

if (blockingRegressions.length > 0) {
  console.error(`\nBundle size regression exceeded ${FAILURE_THRESHOLD}%:`);

  for (const row of blockingRegressions) {
    console.error(
      `- ${row.name} (gzip): main=${formatBytes(row.baseGzip)}, ` +
        `PR=${formatBytes(row.currentGzip)}, ` +
        `change=+${formatPercent(row.gzipChange)}`,
    );
  }

  process.exit(1);
}

console.log("Bundle size comparison passed.");
