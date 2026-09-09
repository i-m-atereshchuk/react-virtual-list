import { expect, test } from "@playwright/test";

import {
  resetList,
  runDynamicBenchmark,
  type RunMetrics,
} from "./helpers/runDynamicBenchmark.ts";
import { percentile } from "./helpers/stats.ts";
import { saveBenchmarkResult } from "./helpers/save-result.ts";

const IS_CI = Boolean(process.env.CI);
const RUNS = IS_CI ? 20 : 50;

// Small enough to stay on MeasurementDynamic under the current
// LAZY_MEASUREMENT_SIZE_RATIO. Exists mainly as a contrast point
// against dynamic-lazy-scroll.spec.ts, to catch a regression where
// the ratio is tuned so low that small/medium lists start paying
// MeasurementDynamicLazy's per-operation overhead for no benefit.
const ITEM_COUNT = 2_000;

const ESTIMATED_ROW_SIZE = 40;
const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 800;
const OVERSCAN = 3;
const SCROLL_STEP = 400;

function printResult(scenario: string, runs: RunMetrics[]) {
  const durations = runs.map((run) => run.duration);
  const worstFrames = runs.map((run) => run.worstFrame);
  const renderItemCalls = runs.map((run) => run.renderItemCalls);

  const msPerScrollStep = runs.map((run) =>
    run.scrollSteps > 0 ? run.duration / run.scrollSteps : 0,
  );

  const result = {
    scenario,

    config: {
      itemCount: ITEM_COUNT,
      estimatedRowSize: ESTIMATED_ROW_SIZE,
      viewportHeight: VIEWPORT_HEIGHT,
      viewportWidth: VIEWPORT_WIDTH,
      overscan: OVERSCAN,
      scrollStep: SCROLL_STEP,
    },

    runs: runs.length,

    duration: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      min: Math.min(...durations),
      max: Math.max(...durations),
    },

    msPerScrollStep: {
      p50: percentile(msPerScrollStep, 50),
      p95: percentile(msPerScrollStep, 95),
      min: Math.min(...msPerScrollStep),
      max: Math.max(...msPerScrollStep),
    },

    worstFrame: {
      p50: percentile(worstFrames, 50),
      p95: percentile(worstFrames, 95),
      min: Math.min(...worstFrames),
      max: Math.max(...worstFrames),
    },

    renderItemCalls: {
      p50: percentile(renderItemCalls, 50),
      p95: percentile(renderItemCalls, 95),
      min: Math.min(...renderItemCalls),
      max: Math.max(...renderItemCalls),
    },

    longTasks: {
      total: runs.reduce((sum, run) => sum + run.longTasks, 0),

      totalDuration: runs.reduce((sum, run) => sum + run.longTaskDuration, 0),

      max: Math.max(...runs.map((run) => run.maxLongTask)),
    },
  };

  console.log(`\n${scenario} result:`);
  console.log(JSON.stringify(result, null, 2));

  saveBenchmarkResult(result.scenario, result);
}

test("dynamic small (2k) scroll", async ({ page }) => {
  await page.goto("/?benchmark=dynamic-small");

  const list = page.getByTestId("react-virtual-lite");

  await expect(list).toBeVisible();

  await expect(list).toHaveCSS("height", `${VIEWPORT_HEIGHT}px`);
  await expect(list).toHaveCSS("width", `${VIEWPORT_WIDTH}px`);

  const runs: RunMetrics[] = [];

  for (let run = 0; run < RUNS; run++) {
    await resetList(page, list);

    const metrics = await runDynamicBenchmark(page, list, SCROLL_STEP);

    runs.push(metrics);

    console.log(
      [
        `Run ${run + 1}/${RUNS}`,
        `duration=${metrics.duration.toFixed(2)}ms`,
        `steps=${metrics.scrollSteps}`,
        `renderItemCalls=${metrics.renderItemCalls}`,
      ].join(" | "),
    );
  }

  printResult("dynamic-small-2k", runs);
});
