interface VirtualListBenchmarkMetrics {
  renderItemCalls: number;
  reset(): void;
}

interface Window {
  __VIRTUAL_LIST_METRICS__: VirtualListBenchmarkMetrics;
}
