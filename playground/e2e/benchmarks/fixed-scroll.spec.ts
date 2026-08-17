import { expect, test } from "@playwright/test";

import { saveBenchmarkResult } from "./helpers/save-result.ts";

const IS_CI = Boolean(process.env.CI);

const RUNS = IS_CI ? 20 : 50;

const ITEM_COUNT = 50_000;
const ROW_SIZE = 40;
const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 800;
const OVERSCAN = 3;

const SCROLL_STEP = 10_000;

type RunMetrics = {
  duration: number;
  frames: number;
  worstFrame: number;
  longTasks: number;
  longTaskDuration: number;
  maxLongTask: number;
  renderItemCalls: number;
};

function percentile(values: number[], percentile: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const index = Math.ceil((percentile / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

test("fixed 50k list scroll", async ({ page }) => {
  await page.goto("/?benchmark=fixed");

  const list = page.getByTestId("react-virtual-lite");

  await expect(list).toBeVisible();

  await expect(list).toHaveCSS("height", `${VIEWPORT_HEIGHT}px`);

  await expect(list).toHaveCSS("width", `${VIEWPORT_WIDTH}px`);

  const initialDimensions = await list.evaluate((element) => ({
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
  }));

  expect(initialDimensions.clientHeight).toBe(VIEWPORT_HEIGHT);
  expect(initialDimensions.clientWidth).toBe(VIEWPORT_WIDTH);

  expect(initialDimensions.scrollHeight).toBeGreaterThan(VIEWPORT_HEIGHT);

  const runs: RunMetrics[] = [];

  for (let run = 0; run < RUNS; run++) {
    await list.evaluate((element) => {
      element.scrollTop = 0;
    });

    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    await page.evaluate(() => {
      window.__VIRTUAL_LIST_METRICS__.reset();
    });

    const browserMetrics = await list.evaluate(async (element, scrollStep) => {
      const frameTimes: number[] = [];
      const longTaskDurations: number[] = [];

      const observer = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          longTaskDurations.push(entry.duration);
        }
      });

      observer.observe({
        type: "longtask",
      });

      let previousFrame = performance.now();
      const start = performance.now();

      const maxScrollTop = element.scrollHeight - element.clientHeight;

      while (element.scrollTop < maxScrollTop) {
        element.scrollTop = Math.min(
          element.scrollTop + scrollStep,
          maxScrollTop,
        );

        await new Promise<void>((resolve) => {
          requestAnimationFrame((now) => {
            frameTimes.push(now - previousFrame);

            previousFrame = now;

            resolve();
          });
        });
      }

      const duration = performance.now() - start;

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

      observer.disconnect();

      return {
        duration,

        frames: frameTimes.length,

        worstFrame: frameTimes.length > 0 ? Math.max(...frameTimes) : 0,

        longTasks: longTaskDurations.length,

        longTaskDuration: longTaskDurations.reduce(
          (sum, value) => sum + value,
          0,
        ),

        maxLongTask:
          longTaskDurations.length > 0 ? Math.max(...longTaskDurations) : 0,
      };
    }, SCROLL_STEP);

    const renderItemCalls = await page.evaluate(
      () => window.__VIRTUAL_LIST_METRICS__.renderItemCalls,
    );

    const metrics: RunMetrics = {
      ...browserMetrics,
      renderItemCalls,
    };

    runs.push(metrics);

    console.log(
      [
        `Run ${run + 1}/${RUNS}`,
        `duration=${metrics.duration.toFixed(2)}ms`,
        `frames=${metrics.frames}`,
        `worstFrame=${metrics.worstFrame.toFixed(2)}ms`,
        `renderItemCalls=${metrics.renderItemCalls}`,
        `longTasks=${metrics.longTasks}`,
      ].join(" | "),
    );
  }

  const durations = runs.map((run) => run.duration);

  const worstFrames = runs.map((run) => run.worstFrame);

  const renderItemCalls = runs.map((run) => run.renderItemCalls);

  const result = {
    scenario: "fixed-50k-scroll",

    config: {
      itemCount: ITEM_COUNT,
      rowSize: ROW_SIZE,
      viewportHeight: VIEWPORT_HEIGHT,
      viewportWidth: VIEWPORT_WIDTH,
      overscan: OVERSCAN,
      scrollStep: SCROLL_STEP,
    },

    runs: RUNS,

    duration: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      min: Math.min(...durations),
      max: Math.max(...durations),
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

  console.log("\nBenchmark result:");
  console.log(JSON.stringify(result, null, 2));
  saveBenchmarkResult(result.scenario, result);
});
