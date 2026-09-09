/**
 * Builds a benchmark's fixture list while bracketing the work with
 * performance marks/measures.
 *
 * Array.from() itself is not free -- for 1,000,000 rows it costs
 * roughly 10-15x more than the difference in construction cost
 * between MeasurementDynamic and MeasurementDynamicLazy that
 * mount-cost.spec.ts is trying to isolate. Rather than trying to make
 * fixture construction free (a precomputed static JSON turned out to
 * be *slower* to parse than just building it, and would mean
 * committing tens of MB to the repo for the 1M-row scenario), the
 * spec instead measures this phase separately via
 * `performance.measure(scenario)` and subtracts it from the
 * end-to-end mount time.
 */
export function buildItems<T>(
  scenario: string,
  count: number,
  mapper: (index: number) => T,
): T[] {
  const startMark = `benchmark:${scenario}:items:start`;
  const endMark = `benchmark:${scenario}:items:end`;

  performance.mark(startMark);

  const items = Array.from({ length: count }, (_, index) => mapper(index));

  performance.mark(endMark);
  performance.measure(scenario, startMark, endMark);

  return items;
}
