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
    // Directly measured via performance.mark/measure around the
    // component's own render-to-commit window (see use-mount-mark.ts)
    // -- network, bundle-parse, and fixture-build time are excluded
    // by construction, not subtracted after the fact. This is the
    // real signal for mount-cost-* scenarios.
    name: "App mount p50",
    path: ["appMountDuration", "p50"],
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
function isTimingMetric(name) {
  if (!name.endsWith("p50")) {
    return false;
  }

  return (
    name.startsWith("Duration") ||
    name.startsWith("Worst frame") ||
    name.startsWith("ms / scroll")
  );
}

function isMountCostScenario(scenario) {
  return scenario.startsWith("mount-cost-");
}

/*
 * mount-cost-* scenarios build their fixture list (Array.from over up
 * to 1,000,000 rows) synchronously inside the measured window -- the
 * single heaviest, most CPU-contention-sensitive step in the whole
 * suite, and it swings well past normal noise on shared runners even
 * with zero code changes (observed: Duration p95 +24%, Items build
 * p50 +12%, on a PR that only touched package.json/CHANGELOG.md).
 * "App mount p50" is measured directly (performance.mark/measure
 * around just the component's render-to-commit window -- see
 * use-mount-mark.ts) with network, bundle-parse, and fixture-build
 * time excluded by construction, so it's the metric from these
 * scenarios that's actually worth gating on. The raw metrics stay
 * visible in the table for diagnosis, just with a much wider noise
 * allowance so they stop showing up as false "Regressions".
 *
 * "App mount p50" itself is still real wall-clock time on a shared
 * runner -- observed swinging +0.29% / +0.68% / +6.78% across three
 * scenarios on a PR whose only change was a forEach -> for...of loop
 * rewrite in two listener-notify methods (no measurable perf effect).
 * It gets its own, wider pair of thresholds instead of the default
 * WARNING_THRESHOLD/FAILURE_THRESHOLD meant for cheap, low-noise
 * metrics like "Render calls" -- with enough headroom above that
 * observed noise band to still catch a real regression (an actual
 * algorithmic change tends to move this by multiples, not by ~5-10%).
 */
const MOUNT_COST_ISOLATED_METRIC = "App mount p50";
const MOUNT_COST_WARNING_THRESHOLD = 30;
const MOUNT_COST_ISOLATED_WARNING_THRESHOLD = 15;
const MOUNT_COST_ISOLATED_FAILURE_THRESHOLD = 20;

function isMountCostIsolatedMetric(row) {
  return (
    isMountCostScenario(row.scenario) && row.name === MOUNT_COST_ISOLATED_METRIC
  );
}

function getWarningThreshold(row) {
  if (isMountCostIsolatedMetric(row)) {
    return MOUNT_COST_ISOLATED_WARNING_THRESHOLD;
  }

  if (isMountCostScenario(row.scenario)) {
    return MOUNT_COST_WARNING_THRESHOLD;
  }

  return WARNING_THRESHOLD;
}

function getFailureThreshold(row) {
  if (isMountCostIsolatedMetric(row)) {
    return MOUNT_COST_ISOLATED_FAILURE_THRESHOLD;
  }

  return FAILURE_THRESHOLD;
}

function isBlockingMetric(row) {
  if (isMountCostScenario(row.scenario)) {
    return row.name === MOUNT_COST_ISOLATED_METRIC;
  }

  return isTimingMetric(row.name);
}

function isMsMetric(name) {
  return (
    name.startsWith("Duration") ||
    name.startsWith("Worst frame") ||
    name.startsWith("ms / scroll") ||
    name.startsWith("Items build") ||
    name.startsWith("App mount")
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
  (row) => row.change >= getWarningThreshold(row),
);

const improvements = comparableRows.filter(
  (row) => row.change <= -getWarningThreshold(row),
);

const blockingRegressions = comparableRows.filter(
  (row) => row.change >= getFailureThreshold(row) && isBlockingMetric(row),
);

const missingRows = rows.filter((row) => row.change === null);

markdown += "\n";

if (regressions.length > 0) {
  markdown += "## ⚠️ Regressions\n\n";

  for (const row of regressions) {
    markdown +=
      `- **${row.scenario} / ${row.name}**: ` +
      `+${formatPercent(row.change)}\n`;

    /*
     * A non-blocking regression (p95 noise, or a mount-cost metric
     * outside the isolated one) still shouldn't be invisible unless
     * someone thinks to open the job summary -- emit it as a GitHub
     * Actions annotation so it shows up as a warning directly on the
     * PR's Checks / Files changed UI even though it doesn't fail CI.
     */
    if (!isBlockingMetric(row) || row.change < getFailureThreshold(row)) {
      console.log(
        `::warning::${row.scenario} / ${row.name}: main=${row.base}, ` +
          `PR=${row.current}, change=+${formatPercent(row.change)}`,
      );
    }
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
  `CI failure threshold: **+${FAILURE_THRESHOLD}%** for timing metrics.  \n` +
  `\`mount-cost-*\` scenarios: only **${MOUNT_COST_ISOLATED_METRIC}** gates CI, ` +
  `at a wider **+${MOUNT_COST_ISOLATED_WARNING_THRESHOLD}%** warning / ` +
  `**+${MOUNT_COST_ISOLATED_FAILURE_THRESHOLD}%** failure threshold (real ` +
  `wall-clock time still has run-to-run noise on shared runners); its other ` +
  `metrics (dominated by fixture-build noise) use a ` +
  `**+${MOUNT_COST_WARNING_THRESHOLD}%** warning threshold and never block.\n`;

console.log(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}

if (blockingRegressions.length > 0) {
  console.error(`\nPerformance regression exceeded threshold:`);

  for (const row of blockingRegressions) {
    console.error(
      `- ${row.scenario} / ${row.name}: ` +
        `main=${row.base}, PR=${row.current}, ` +
        `change=+${formatPercent(row.change)} ` +
        `(threshold: +${getFailureThreshold(row)}%)`,
    );
  }

  process.exit(1);
}

console.log("Benchmark comparison passed.");
