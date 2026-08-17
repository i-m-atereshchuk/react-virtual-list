import { expect, test, type Locator, type Page } from "@playwright/test";

const RUNS = 50;
const WARMUP_RUNS = 3;

const ITEM_COUNT = 50_000;

const MIN_ROW_SIZE = 30;
const MAX_ROW_SIZE = 50;
const ESTIMATED_ROW_SIZE = 40;

const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 800;

const OVERSCAN = 3;
const SCROLL_STEP = 10_000;

type RunMetrics = {
  duration: number;
  frames: number;
  scrollSteps: number;

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

async function waitForSettledFrames(page: Page) {
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
}

async function resetList(page: Page, list: Locator) {
  await list.evaluate((element) => {
    element.scrollTop = 0;
  });

  await waitForSettledFrames(page);
}

async function runScroll(page: Page, list: Locator): Promise<RunMetrics> {
  /*
   * Ignore renderItem calls that happened before this run.
   */
  await page.evaluate(() => {
    window.__VIRTUAL_LIST_METRICS__.reset();
  });

  const browserMetrics = await list.evaluate(async (element, scrollStep) => {
    const frameTimes: number[] = [];
    const longTaskDurations: number[] = [];

    let scrollSteps = 0;

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

    while (true) {
      /*
       * Dynamic measurement may change scrollHeight,
       * therefore calculate it on every iteration.
       */
      const maxScrollTop = element.scrollHeight - element.clientHeight;

      if (element.scrollTop >= maxScrollTop) {
        break;
      }

      const previousScrollTop = element.scrollTop;

      element.scrollTop = Math.min(
        previousScrollTop + scrollStep,
        maxScrollTop,
      );

      scrollSteps++;

      await new Promise<void>((resolve) => {
        requestAnimationFrame((now) => {
          frameTimes.push(now - previousFrame);

          previousFrame = now;

          resolve();
        });
      });

      /*
       * Prevent an infinite loop if scrolling stops
       * progressing for some reason.
       */
      if (element.scrollTop === previousScrollTop) {
        break;
      }
    }

    /*
     * Let final React + ResizeObserver work settle.
     */
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const duration = performance.now() - start;

    for (const entry of observer.takeRecords()) {
      longTaskDurations.push(entry.duration);
    }

    observer.disconnect();

    return {
      duration,

      frames: frameTimes.length,

      scrollSteps,

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

  return {
    ...browserMetrics,
    renderItemCalls,
  };
}

function printRun(prefix: string, run: number, metrics: RunMetrics) {
  console.log(
    [
      `${prefix} ${run + 1}/${RUNS}`,
      `duration=${metrics.duration.toFixed(2)}ms`,
      `steps=${metrics.scrollSteps}`,
      `frames=${metrics.frames}`,
      `worstFrame=${metrics.worstFrame.toFixed(2)}ms`,
      `renderItemCalls=${metrics.renderItemCalls}`,
      `longTasks=${metrics.longTasks}`,
    ].join(" | "),
  );
}

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
      minRowSize: MIN_ROW_SIZE,
      maxRowSize: MAX_ROW_SIZE,

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
}

/*
 * WARM
 *
 * One VirtualList instance.
 *
 * We first perform several complete scrolls so dynamic row
 * measurements are populated. Only subsequent runs are measured.
 */
test("dynamic 50k warm scroll", async ({ page }) => {
  await page.goto("/?benchmark=dynamic");

  const list = page.getByTestId("react-virtual-lite");

  await expect(list).toBeVisible();

  await expect(list).toHaveCSS("height", `${VIEWPORT_HEIGHT}px`);

  await expect(list).toHaveCSS("width", `${VIEWPORT_WIDTH}px`);

  /*
   * Warmup runs.
   *
   * These results are intentionally discarded.
   */
  for (let run = 0; run < WARMUP_RUNS; run++) {
    await resetList(page, list);

    const metrics = await runScroll(page, list);

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

  /*
   * Measured warm runs.
   */
  for (let run = 0; run < RUNS; run++) {
    await resetList(page, list);

    const metrics = await runScroll(page, list);

    runs.push(metrics);

    printRun("Warm", run, metrics);
  }

  printResult("dynamic-50k-warm", runs, {
    warmupRuns: WARMUP_RUNS,
  });
});

/*
 * COLD
 *
 * Create a completely new VirtualList before every run.
 *
 * That means useMeasurement starts with a fresh measurement
 * cache and rows have to be measured again.
 */
test("dynamic 50k cold scroll", async ({ page }) => {
  const runs: RunMetrics[] = [];

  for (let run = 0; run < RUNS; run++) {
    /*
     * Navigation destroys the previous React tree and creates
     * a new VirtualList instance.
     */
    await page.goto("/?benchmark=dynamic");

    const list = page.getByTestId("react-virtual-lite");

    await expect(list).toBeVisible();

    await expect
      .poll(async () => {
        return list.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        );
      })
      .toBe(true);

    /*
     * Do NOT perform a warmup or reset scroll position here.
     *
     * We want the first traversal of a fresh VirtualList.
     */
    const metrics = await runScroll(page, list);

    runs.push(metrics);

    printRun("Cold", run, metrics);
  }

  printResult("dynamic-50k-cold", runs, {
    reloadBeforeEachRun: true,
  });
});
