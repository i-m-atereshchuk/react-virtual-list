import type { Locator, Page } from "@playwright/test";

export type RunMetrics = {
  duration: number;
  scrollSteps: number;
  frames: number;
  worstFrame: number;

  longTasks: number;
  longTaskDuration: number;
  maxLongTask: number;

  renderItemCalls: number;
};

export async function waitForBrowser(page: Page) {
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

export async function resetList(page: Page, list: Locator) {
  await list.evaluate((element) => {
    element.scrollTop = 0;
  });

  await waitForBrowser(page);
}

export async function runDynamicBenchmark(
  page: Page,
  list: Locator,
  scrollStep: number,
): Promise<RunMetrics> {
  await page.evaluate(() => {
    window.__VIRTUAL_LIST_METRICS__.reset();
  });

  const browserMetrics = await list.evaluate(async (element, step) => {
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

    let scrollSteps = 0;

    while (true) {
      /*
       * Dynamic measurements can change scrollHeight,
       * therefore maxScrollTop must not be cached.
       */
      const maxScrollTop = element.scrollHeight - element.clientHeight;

      if (element.scrollTop >= maxScrollTop) {
        break;
      }

      const previousScrollTop = element.scrollTop;

      element.scrollTop = Math.min(previousScrollTop + step, maxScrollTop);

      scrollSteps++;

      await new Promise<void>((resolve) => {
        requestAnimationFrame((now) => {
          frameTimes.push(now - previousFrame);

          previousFrame = now;

          resolve();
        });
      });

      /*
       * Avoid an infinite loop if the browser cannot
       * advance the scroll position.
       */
      if (element.scrollTop === previousScrollTop) {
        break;
      }
    }

    /*
     * Allow the final render and ResizeObserver
     * measurements to settle.
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

      scrollSteps,

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
  }, scrollStep);

  const renderItemCalls = await page.evaluate(
    () => window.__VIRTUAL_LIST_METRICS__.renderItemCalls,
  );

  return {
    ...browserMetrics,
    renderItemCalls,
  };
}
