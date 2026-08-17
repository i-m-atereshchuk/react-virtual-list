import { expect, test } from "@playwright/test";

const RUNS = 10;
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

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

test("fixed 50k list scroll", async ({ page }) => {
  await page.goto("/?benchmark=fixed");

  const list = page.getByTestId("react-virtual-lite");

  await expect(list).toBeVisible();

  const runs: RunMetrics[] = [];

  for (let run = 0; run < RUNS; run++) {
    // Повертаємо список на початок перед кожним run.
    await list.evaluate((element) => {
      element.scrollTop = 0;
    });

    // Даємо React/browser завершити роботу після scroll reset.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        }),
    );

    // Все, що було до benchmark run, нас не цікавить.
    await page.evaluate(() => {
      window.__VIRTUAL_LIST_METRICS__.reset();
    });

    const browserMetrics = await list.evaluate(async (element, scrollStep) => {
      const frameTimes: number[] = [];
      const longTasks: number[] = [];

      const observer = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          longTasks.push(entry.duration);
        }
      });

      observer.observe({
        type: "longtask",
      });

      let previousFrame = performance.now();
      const start = performance.now();

      while (element.scrollTop < element.scrollHeight - element.clientHeight) {
        element.scrollTop += scrollStep;
        console.log("scrollStep", scrollStep);

        await new Promise<void>((resolve) => {
          requestAnimationFrame((now) => {
            frameTimes.push(now - previousFrame);
            previousFrame = now;

            resolve();
          });
        });
      }

      const duration = performance.now() - start;

      observer.disconnect();

      return {
        duration,

        frames: frameTimes.length,

        worstFrame: Math.max(...frameTimes),

        longTasks: longTasks.length,

        longTaskDuration: longTasks.reduce((sum, value) => sum + value, 0),

        maxLongTask: longTasks.length > 0 ? Math.max(...longTasks) : 0,
      };
    }, SCROLL_STEP);

    const renderItemCalls = await page.evaluate(() => {
      return window.__VIRTUAL_LIST_METRICS__.renderItemCalls;
    });

    const metrics: RunMetrics = {
      ...browserMetrics,
      renderItemCalls,
    };

    runs.push(metrics);

    console.log(`Run ${run + 1}: renderItem calls = ${renderItemCalls}`);
  }

  const durations = runs.map((run) => run.duration);

  const worstFrames = runs.map((run) => run.worstFrame);

  const renderItemCalls = runs.map((run) => run.renderItemCalls);

  const result = {
    scenario: "fixed-50k-scroll",

    config: {
      itemCount: 50_000,
      rowSize: 40,
      viewportHeight: 600,
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

  console.log(JSON.stringify(result, null, 2));
});
