import { expect, test } from "@playwright/test";

import {
  resetList,
  runDynamicBenchmark,
  type RunMetrics,
} from "./helpers/runDynamicBenchmark.ts";
import { percentile } from "./helpers/stats.ts";
import { saveBenchmarkResult } from "./helpers/save-result.ts";

const IS_CI = Boolean(process.env.CI);
const RUNS = IS_CI ? 10 : 25;
const WARMUP_RUNS = IS_CI ? 2 : 3;

// Comfortably past LAZY_MEASUREMENT_SIZE_RATIO -- this always
// exercises MeasurementDynamicLazy. Compare against dynamic-50k-* to
// see how the lazy variant's per-operation overhead trades off
// against MeasurementDynamic's O(listSize) construction cost.
const ITEM_COUNT = 1_000_000;

const ESTIMATED_ROW_SIZE = 40;
const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 800;
const OVERSCAN = 3;
const SCROLL_STEP = 200_000;

function printResult(
  scenario: string,
  runs: RunMetrics[],
  extraConfig: Record<string, unknown> = {},
) {
  const durations = runs.map((run) => run.duration);
  const worstFrames = runs.map((run) => run.worstFrame);
  const renderItemCalls = runs.map((run) => run.renderItemCalls);
  const scrollSteps = runs.map((run) => run.scrollSteps);

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

      ...extraConfig,
    },

    runs: runs.length,

    duration: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      min: Math.min(...durations),
      max: Math.max(...durations),
    },

    scrollSteps: {
      p50: percentile(scrollSteps, 50),
      p95: percentile(scrollSteps, 95),
      min: Math.min(...scrollSteps),
      max: Math.max(...scrollSteps),
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

/*
 * WARM
 *
 * One VirtualList instance, scrolled through repeatedly so row
 * measurements (and the lazily-materialized Fenwick tree range) are
 * already populated before the measured runs.
 */
test("dynamic lazy (1M) warm scroll", async ({ page }) => {
  await page.goto("/?benchmark=dynamic-lazy");

  const list = page.getByTestId("react-virtual-lite");

  await expect(list).toBeVisible();
  await expect(list).toHaveCSS("height", `${VIEWPORT_HEIGHT}px`);
  await expect(list).toHaveCSS("width", `${VIEWPORT_WIDTH}px`);

  for (let run = 0; run < WARMUP_RUNS; run++) {
    await resetList(page, list);

    const metrics = await runDynamicBenchmark(page, list, SCROLL_STEP);

    console.log(
      [
        `Warmup ${run + 1}/${WARMUP_RUNS}`,
        `duration=${metrics.duration.toFixed(2)}ms`,
        `steps=${metrics.scrollSteps}`,
        `renders=${metrics.renderItemCalls}`,
      ].join(" | "),
    );
  }

  const runs: RunMetrics[] = [];

  for (let run = 0; run < RUNS; run++) {
    await resetList(page, list);

    const metrics = await runDynamicBenchmark(page, list, SCROLL_STEP);

    runs.push(metrics);

    console.log(
      [
        `Warm ${run + 1}/${RUNS}`,
        `duration=${metrics.duration.toFixed(2)}ms`,
        `steps=${metrics.scrollSteps}`,
        `renderItemCalls=${metrics.renderItemCalls}`,
      ].join(" | "),
    );
  }

  printResult("dynamic-lazy-1m-warm", runs, {
    warmupRuns: WARMUP_RUNS,
  });
});

/*
 * COLD
 *
 * Reload before every run, so every traversal starts from a fresh
 * measurement instance -- nothing materialized yet.
 */
test("dynamic lazy (1M) cold scroll", async ({ page }) => {
  const runs: RunMetrics[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto("/?benchmark=dynamic-lazy");

    const list = page.getByTestId("react-virtual-lite");

    await expect(list).toBeVisible();

    await expect
      .poll(async () => {
        return list.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        );
      })
      .toBe(true);

    const metrics = await runDynamicBenchmark(page, list, SCROLL_STEP);

    runs.push(metrics);

    console.log(
      [
        `Cold ${run + 1}/${RUNS}`,
        `duration=${metrics.duration.toFixed(2)}ms`,
        `steps=${metrics.scrollSteps}`,
        `renderItemCalls=${metrics.renderItemCalls}`,
      ].join(" | "),
    );
  }

  printResult("dynamic-lazy-1m-cold", runs, {
    reloadBeforeEachRun: true,
  });
});
