import { expect, test } from "@playwright/test";

import { percentile } from "./helpers/stats.ts";
import { saveBenchmarkResult } from "./helpers/save-result.ts";

const IS_CI = Boolean(process.env.CI);
const RUNS = IS_CI ? 15 : 30;

/*
 * Measures pure "time to first visible virtualized row" -- no
 * scrolling at all. Unlike the scroll benchmarks, this isolates the
 * one-time mount cost: bundle parse/exec is the same across every
 * scenario, so the *relative* difference between scenarios should be
 * dominated by measurement construction -- O(listSize) for
 * MeasurementDynamic vs O(viewport) for MeasurementDynamicLazy.
 *
 * Building the fixture list itself (Array.from over listSize) is NOT
 * free -- at 1,000,000 rows it costs far more than the measurement
 * classes' own construction-time difference, so it would otherwise
 * swamp the signal this benchmark exists to isolate. Each
 * `data/*-items.ts` file brackets its own Array.from call with a
 * performance.measure(benchmark) (see build-items.ts); we read that
 * back here and report both the raw end-to-end duration and the
 * duration with fixture construction subtracted out. The latter is
 * the number that actually reflects the measurement class, and is
 * the one to watch when sanity-checking LAZY_MEASUREMENT_SIZE_RATIO.
 */
const scenarios = [
  { benchmark: "fixed", label: "fixed-50k" },
  { benchmark: "dynamic-small", label: "dynamic-small-2k" },
  { benchmark: "dynamic", label: "dynamic-50k" },
  { benchmark: "dynamic-lazy", label: "dynamic-lazy-1m" },
];

for (const { benchmark, label } of scenarios) {
  test(`mount cost: ${label}`, async ({ page }) => {
    const durations: number[] = [];
    const itemsBuildDurations: number[] = [];
    const excludingItemsBuildDurations: number[] = [];

    for (let run = 0; run < RUNS; run++) {
      const start = Date.now();

      await page.goto(`/?benchmark=${benchmark}`);

      const list = page.getByTestId("react-virtual-lite");

      await expect(list).toBeVisible();

      const duration = Date.now() - start;

      const itemsBuildMs = await page.evaluate((measureName) => {
        const entries = performance.getEntriesByName(measureName, "measure");

        return entries.length > 0 ? entries[entries.length - 1].duration : 0;
      }, benchmark);

      durations.push(duration);
      itemsBuildDurations.push(itemsBuildMs);
      excludingItemsBuildDurations.push(Math.max(0, duration - itemsBuildMs));

      console.log(
        [
          `${label} ${run + 1}/${RUNS}`,
          `duration=${duration}ms`,
          `itemsBuild=${itemsBuildMs.toFixed(2)}ms`,
          `excludingItemsBuild=${(duration - itemsBuildMs).toFixed(2)}ms`,
        ].join(" | "),
      );
    }

    const result = {
      scenario: `mount-cost-${label}`,

      config: {
        benchmark,
        runs: RUNS,
      },

      duration: {
        p50: percentile(durations, 50),
        p95: percentile(durations, 95),
        min: Math.min(...durations),
        max: Math.max(...durations),
      },

      itemsBuildDuration: {
        p50: percentile(itemsBuildDurations, 50),
        p95: percentile(itemsBuildDurations, 95),
        min: Math.min(...itemsBuildDurations),
        max: Math.max(...itemsBuildDurations),
      },

      // duration with the fixture-list construction subtracted out --
      // the number that actually reflects measurement class overhead.
      durationExcludingItemsBuild: {
        p50: percentile(excludingItemsBuildDurations, 50),
        p95: percentile(excludingItemsBuildDurations, 95),
        min: Math.min(...excludingItemsBuildDurations),
        max: Math.max(...excludingItemsBuildDurations),
      },
    };

    console.log(`\n${result.scenario} result:`);
    console.log(JSON.stringify(result, null, 2));

    saveBenchmarkResult(result.scenario, result);
  });
}
