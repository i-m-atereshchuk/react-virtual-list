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

const scenarios = ["fixed-50k-scroll", "dynamic-50k-warm", "dynamic-50k-cold"];

const WARNING_THRESHOLD = 5;
const FAILURE_THRESHOLD = 10;

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

function readResult(directory, scenario) {
  const file = path.join(directory, `${scenario}.json`);

  if (!fs.existsSync(file)) {
    console.error(`Benchmark result not found for "${scenario}":`);
    console.error(file);

    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to read benchmark result "${file}":`);
    console.error(error);

    process.exit(1);
  }
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

function isBlockingMetric(name) {
  return (
    name.startsWith("Duration") ||
    name.startsWith("Worst frame") ||
    name.startsWith("ms / scroll")
  );
}

assertDirectory(baseDir, "Base");
assertDirectory(currentDir, "Current");

console.log("Benchmark comparison");
console.log(`Base:    ${baseDir}`);
console.log(`Current: ${currentDir}`);
console.log("");

const rows = [];

for (const scenario of scenarios) {
  const base = readResult(baseDir, scenario);
  const current = readResult(currentDir, scenario);

  const metrics = [
    {
      name: "Duration p50",
      base: base.duration.p50,
      current: current.duration.p50,
      format: formatMs,
    },
    {
      name: "Duration p95",
      base: base.duration.p95,
      current: current.duration.p95,
      format: formatMs,
    },
    {
      name: "Worst frame p95",
      base: base.worstFrame.p95,
      current: current.worstFrame.p95,
      format: formatMs,
    },
    {
      name: "Render calls p50",
      base: base.renderItemCalls.p50,
      current: current.renderItemCalls.p50,
      format: formatInteger,
    },
  ];

  if (base.msPerScrollStep && current.msPerScrollStep) {
    metrics.push({
      name: "ms / scroll step p50",
      base: base.msPerScrollStep.p50,
      current: current.msPerScrollStep.p50,
      format: formatMs,
    });
  }

  for (const metric of metrics) {
    const change = percentChange(metric.base, metric.current);

    rows.push({
      scenario,
      name: metric.name,
      base: metric.format(metric.base),
      current: metric.format(metric.current),
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

const regressions = rows.filter((row) => row.change >= WARNING_THRESHOLD);

const improvements = rows.filter((row) => row.change <= -WARNING_THRESHOLD);

const blockingRegressions = rows.filter(
  (row) => row.change >= FAILURE_THRESHOLD && isBlockingMetric(row.name),
);

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
