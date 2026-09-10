import { expect, test } from "@playwright/test";

import { summarize } from "./helpers/stats.ts";
import { saveBenchmarkResult } from "./helpers/save-result.ts";

const IS_CI = Boolean(process.env.CI);
const RUNS = IS_CI ? 25 : 30;

/*
 * The very first page.goto() to a URL in a fresh browser context pays for
 * an empty V8 bytecode cache -- Chromium only starts serving cached
 * bytecode for a script once it's seen that exact resource before in this
 * context. That makes run #1 systematically slower than the rest, for
 * reasons that have nothing to do with the code under test. A few
 * untimed warm-up loads prime that cache before any recorded run starts.
 */
const WARMUP_RUNS = 3;

/*
 * Measures pure "time to first visible virtualized row" -- no
 * scrolling at all. Unlike the scroll benchmarks, this isolates the
 * one-time mount cost: bundle parse/exec is the same across every
 * scenario, so the *relative* difference between scenarios should be
 * dominated by measurement construction -- O(listSize) for
 * MeasurementDynamic vs O(viewport) for MeasurementDynamicLazy.
 *
 * `duration` (raw goto -> visible) mixes in network/bundle-parse time
 * and, worse, Array.from()-ing the fixture list -- at 1,000,000 rows
 * that alone costs far more than the measurement classes' own
 * construction-time difference, so it would swamp the signal this
 * benchmark exists to isolate. Rather than *inferring* the real cost
 * by subtracting fixture-build time back out of the wall clock, each
 * benchmark component directly brackets its own mount with
 * performance.mark/measure via useMountMark() (see use-mount-mark.ts):
 * the start mark is taken at the top of the component's render body
 * (after its module -- and the fixture data it imports -- already
 * finished loading), and the end mark fires from a layout effect on
 * first commit. That `${benchmark}:app-mount` measure is a *direct*
 * reading of React-mount + measurement-class-construction time, with
 * network and fixture-build already excluded by construction rather
 * than subtracted after the fact. It's the number to watch when
 * sanity-checking LAZY_MEASUREMENT_SIZE_RATIO.
 */
const scenarios = [
  { benchmark: "fixed", label: "fixed-50k" },
  { benchmark: "dynamic-small", label: "dynamic-small-2k" },
  { benchmark: "dynamic", label: "dynamic-50k" },
  { benchmark: "dynamic-lazy", label: "dynamic-lazy-1m" },
];

for (const { benchmark, label } of scenarios) {
  test(`mount cost: ${label}`, async ({ page }) => {
    /*
     * Forces a GC pass as early as possible on every fresh document,
     * before any app code runs -- so a collection that would otherwise
     * land at a random point during a later run's measured window
     * (courtesy of Chromium potentially reusing the renderer process,
     * and its heap, across same-origin navigations) is much less likely
     * to happen there instead. Requires --js-flags=--expose-gc, set in
     * playwright.benchmark.config.ts; window.gc is undefined otherwise,
     * so this is a silent no-op outside that config.
     */
    await page.addInitScript(() => {
      const globalWithGc = window as typeof window & { gc?: () => void };

      globalWithGc.gc?.();
    });

    for (let warmup = 0; warmup < WARMUP_RUNS; warmup++) {
      await page.goto(`/?benchmark=${benchmark}`);
      await expect(page.getByTestId("react-virtual-lite")).toBeVisible();
    }

    const durations: number[] = [];
    const itemsBuildDurations: number[] = [];
    const appMountDurations: number[] = [];
    const excludingItemsBuildDurations: number[] = [];

    for (let run = 0; run < RUNS; run++) {
      const start = Date.now();

      await page.goto(`/?benchmark=${benchmark}`);

      const list = page.getByTestId("react-virtual-lite");

      await expect(list).toBeVisible();

      const duration = Date.now() - start;

      const { itemsBuildMs, appMountMs } = await page.evaluate((name) => {
        const read = (measureName: string) => {
          const entries = performance.getEntriesByName(measureName, "measure");

          return entries.length > 0 ? entries[entries.length - 1].duration : 0;
        };

        return {
          itemsBuildMs: read(`${name}:items-build`),
          appMountMs: read(`${name}:app-mount`),
        };
      }, benchmark);

      durations.push(duration);
      itemsBuildDurations.push(itemsBuildMs);
      appMountDurations.push(appMountMs);
      excludingItemsBuildDurations.push(Math.max(0, duration - itemsBuildMs));

      console.log(
        [
          `${label} ${run + 1}/${RUNS}`,
          `duration=${duration}ms`,
          `itemsBuild=${itemsBuildMs.toFixed(2)}ms`,
          `appMount=${appMountMs.toFixed(2)}ms`,
        ].join(" | "),
      );
    }

    const result = {
      scenario: `mount-cost-${label}`,

      config: {
        benchmark,
        runs: RUNS,
        warmupRuns: WARMUP_RUNS,
      },

      duration: summarize(durations),
      itemsBuildDuration: summarize(itemsBuildDurations),

      // Directly measured (not inferred) React-mount +
      // measurement-class-construction time -- the primary signal.
      appMountDuration: summarize(appMountDurations),

      // Kept for cross-checking against appMountDuration: duration
      // with fixture-list construction subtracted back out. Still
      // includes network/bundle-parse noise that appMountDuration
      // excludes by construction.
      durationExcludingItemsBuild: summarize(excludingItemsBuildDurations),
    };

    console.log(`\n${result.scenario} result:`);
    console.log(JSON.stringify(result, null, 2));

    saveBenchmarkResult(result.scenario, result);
  });
}
