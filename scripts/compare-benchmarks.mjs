import fs from "node:fs";
import path from "node:path";

const [baseDirArg, currentDirArg] = process.argv.slice(2);

if (!baseDirArg || !currentDirArg) {
  console.error(
    "Usage: node scripts/compare-benchmarks.mjs <base-results> <current-results>",
  );

  console.error(
    "Example: node scripts/compare-benchmarks.mjs " +
      "../main/playground/benchmark-results " +
      "playground/benchmark-results",
  );

  process.exit(1);
}

const baseDir = path.resolve(baseDirArg);
const currentDir = path.resolve(currentDirArg);

const WARNING_THRESHOLD = 5;
const FAILURE_THRESHOLD = 10;

/*
 * Below this absolute difference (in ms), a percentage change is
 * ignored entirely -- e.g. an "Items build" of 0.40ms -> 0.50ms reads
 * as +25% but is pure timer/measurement jitter, not a real change.
 */
const MIN_MS_DIFFERENCE_TO_FLAG = 2;

/*
 * Every metric a scenario's result *might* have. Different scenario
 * types have different shapes (e.g. mount-cost-* has no worstFrame /
 * renderItemCalls / msPerScrollStep at all, and only *-scroll has
 * scrollSteps), so a metric is only turned into a row when at least
 * one of base/current actually has it -- see safeGet below.
 */
const METRIC_DEFINITIONS = [
  { name: "Duration p50", path: ["duration", "p50"], format: formatMs },
  { name: "Duration p95", path: ["duration", "p95"], format: formatMs },
  { name: "Worst frame p95", path: ["worstFrame", "p95"], format: formatMs },
  {
    name: "Render calls p50",
    path: ["renderItemCalls", "p50"],
    format: formatInteger,
  },
  {
    name: "ms / scroll step p50",
    path: ["msPerScrollStep", "p50"],
    format: formatMs,
  },
  {
    name: "Items build p50",
    path: ["itemsBuildDuration", "p50"],
    format: formatMs,
  },
  {
    name: "Duration excl. items build p50",
    path: ["durationExcludingItemsBuild", "p50"],
    format: formatMs,
  },
];

function assertDirectory(directory, label) {
  if (!fs.existsSync(directory)) {
    console.error(`${label} benchmark directory does not exist:`);
    console.error(directory);

    process.exit(1);
  }

  const stat = fs.statSync(directory);

  if (!stat.isDirectory()) {
    console.error(`${label} benchmark path is not a directory:`);
    console.error(directory);

    process.exit(1);
  }
}

function listScenarios(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length));
}

/*
 * Missing file or unreadable/corrupt JSON both resolve to `null`
 * instead of crashing -- a scenario that only exists on one side
 * (new benchmark not on main yet, or one removed) is expected, not
 * an error. A parse failure is logged so it doesn't fail silently,
 * but it still degrades to N/A rather than aborting the whole
 * comparison.
 */
function readResult(directory, scenario) {
  const file = path.join(directory, `${scenario}.json`);

  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to read benchmark result "${file}":`);
    console.error(error);

    return null;
  }
}

function safeGet(object, keyPath) {
  let value = object;

  for (const key of keyPath) {
    if (value === null || typeof value !== "object") {
      return undefined;
    }

    value = value[key];
  }

  return typeof value === "number" ? value : undefined;
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

  if (Math.abs(value) < 0.1) {
    return `➖ ${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `🟢 ${value.toFixed(2)}%`;
  }

  return `🔴 +${value.toFixed(2)}%`;
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function formatInteger(value) {
  return String(Math.round(value));
}

/*
 * p95 (and worst-frame/ms-per-step, which are effectively the same
 * kind of tail measurement) swings 50%+ between two runs of
 * *identical* code on shared GitHub-hosted runners -- a single slow
 * page load drags the tail up or down while the median barely moves.
 * Only p50 is stable enough to fail the build on; p95 stays visible
 * in the report for awareness but never blocks CI.
 */
function isBlockingMetric(name) {
  if (!name.endsWith("p50")) {
    return false;
  }

  return (
    name.startsWith("Duration") ||
    name.startsWith("Worst frame") ||
    name.startsWith("ms / scroll")
  );
}

function isMsMetric(name) {
  return (
    name.startsWith("Duration") ||
    name.startsWith("Worst frame") ||
    name.startsWith("ms / scroll") ||
    name.startsWith("Items build")
  );
}

function isNegligibleDifference(row) {
  if (!isMsMetric(row.name)) {
    return false;
  }

  if (row.baseValue === undefined || row.currentValue === undefined) {
    return false;
  }

  return Math.abs(row.currentValue - row.baseValue) < MIN_MS_DIFFERENCE_TO_FLAG;
}

assertDirectory(baseDir, "Base");
assertDirectory(currentDir, "Current");

console.log("Benchmark comparison");
console.log(`Base:    ${baseDir}`);
console.log(`Current: ${currentDir}`);
console.log("");

const scenarios = Array.from(
  new Set([...listScenarios(baseDir), ...listScenarios(currentDir)]),
).sort();

if (scenarios.length === 0) {
  console.log("No benchmark results found in either directory.");

  process.exit(0);
}

const rows = [];

for (const scenario of scenarios) {
  const base = readResult(baseDir, scenario);
  const current = readResult(currentDir, scenario);

  for (const metric of METRIC_DEFINITIONS) {
    const baseValue = base ? safeGet(base, metric.path) : undefined;
    const currentValue = current ? safeGet(current, metric.path) : undefined;

    /*
     * Neither side has this metric for this scenario at all
     * (e.g. "Worst frame p95" for a mount-cost-* scenario) --
     * there is nothing meaningful to show, so skip the row
     * entirely rather than printing "N/A | N/A | N/A".
     */
    if (baseValue === undefined && currentValue === undefined) {
      continue;
    }

    const change =
      baseValue === undefined || currentValue === undefined
        ? null
        : percentChange(baseValue, currentValue);

    rows.push({
      scenario,
      name: metric.name,
      baseValue,
      currentValue,
      base: baseValue === undefined ? "N/A" : metric.format(baseValue),
      current: currentValue === undefined ? "N/A" : metric.format(currentValue),
      change,
    });
  }
}

let markdown = `# ⚡ react-virtual-lite benchmark

Compared with \`main\`.

| Scenario | Metric | main | PR | Change |
|---|---|---:|---:|---:|
`;

for (const row of rows) {
  markdown +=
    `| ${row.scenario} ` +
    `| ${row.name} ` +
    `| ${row.base} ` +
    `| ${row.current} ` +
    `| ${formatChange(row.change)} |\n`;
}

const comparableRows = rows.filter(
  (row) => row.change !== null && !isNegligibleDifference(row),
);

const regressions = comparableRows.filter(
  (row) => row.change >= WARNING_THRESHOLD,
);

const improvements = comparableRows.filter(
  (row) => row.change <= -WARNING_THRESHOLD,
);

const blockingRegressions = comparableRows.filter(
  (row) => row.change >= FAILURE_THRESHOLD && isBlockingMetric(row.name),
);

const missingRows = rows.filter((row) => row.change === null);

markdown += "\n";

if (regressions.length > 0) {
  markdown += "## ⚠️ Regressions\n\n";

  for (const row of regressions) {
    markdown +=
      `- **${row.scenario} / ${row.name}**: ` +
      `+${formatPercent(row.change)}\n`;
  }
} else {
  markdown += "## ✅ No significant regressions\n\n";
}

if (improvements.length > 0) {
  markdown += "## 🚀 Improvements\n\n";

  for (const row of improvements) {
    markdown +=
      `- **${row.scenario} / ${row.name}**: ` +
      `${formatPercent(row.change)}\n`;
  }
}

if (missingRows.length > 0) {
  markdown += "\n## ℹ️ Only present on one side\n\n";

  for (const row of missingRows) {
    markdown +=
      `- **${row.scenario} / ${row.name}**: ` +
      `main=${row.base}, PR=${row.current}\n`;
  }
}

markdown += "\n---\n\n";

markdown +=
  `Regression warning threshold: **+${WARNING_THRESHOLD}%**  \n` +
  `CI failure threshold: **+${FAILURE_THRESHOLD}%** for timing metrics.\n`;

console.log(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}

if (blockingRegressions.length > 0) {
  console.error(`\nPerformance regression exceeded ${FAILURE_THRESHOLD}%:`);

  for (const row of blockingRegressions) {
    console.error(
      `- ${row.scenario} / ${row.name}: ` +
        `main=${row.base}, PR=${row.current}, ` +
        `change=+${formatPercent(row.change)}`,
    );
  }

  process.exit(1);
}

console.log("Benchmark comparison passed.");
