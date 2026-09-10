export function percentile(values: number[], percentileRank: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const index = Math.ceil((percentileRank / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

/**
 * Drops the most extreme samples from each end before any percentile is
 * computed from the result. A cold-cache first run, a one-off GC pause, or
 * a momentary CI scheduling blip can produce a handful of genuine outliers
 * that have nothing to do with the code under test -- trimming them keeps
 * the reported percentiles representative of steady-state behavior instead
 * of runner noise.
 *
 * `trimRatio` is the fraction dropped from EACH end (default 10%), so e.g.
 * 25 samples -> 2 trimmed off each end -> 21 remain. Below `minSamples` the
 * input is returned untouched -- trimming a tiny sample set would throw
 * away signal rather than noise.
 */
export function trimOutliers(
  values: number[],
  trimRatio = 0.1,
  minSamples = 10,
) {
  if (values.length < minSamples) {
    return values;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimRatio);

  if (trimCount === 0) {
    return sorted;
  }

  return sorted.slice(trimCount, sorted.length - trimCount);
}

/**
 * p50/p95 are computed from the trimmed set (see trimOutliers) so a
 * handful of runner-noise outliers don't skew them; min/max are reported
 * from the raw, untrimmed samples so the true observed range still shows
 * up in the result for debugging.
 */
export function summarize(values: number[]) {
  const trimmed = trimOutliers(values);

  return {
    p50: percentile(trimmed, 50),
    p95: percentile(trimmed, 95),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
