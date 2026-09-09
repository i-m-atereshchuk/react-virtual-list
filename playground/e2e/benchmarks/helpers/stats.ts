export function percentile(values: number[], percentileRank: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const index = Math.ceil((percentileRank / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}
