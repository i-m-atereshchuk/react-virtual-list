import { useLayoutEffect } from "react";

/**
 * Directly measures the render-to-commit window for a benchmark
 * component via performance.mark/measure, instead of inferring it by
 * subtracting fixture-build time from the total page-load duration.
 *
 * The start mark is taken at the top of the component's render body,
 * which -- since this component's module (and therefore any fixture
 * data it imports) already finished loading and executing before
 * React ever calls this function -- only starts counting once
 * network fetch, bundle parse, and Array.from() fixture construction
 * are all already behind us. The end mark fires from a layout effect
 * on first commit, i.e. once React has finished mounting the
 * subtree (including constructing whatever Measurement class
 * useVirtualized picked).
 *
 * Reports as performance.measure(`${scenario}:app-mount`), read by
 * mount-cost.spec.ts as the scenario's "real" mount cost.
 */
export function useMountMark(scenario: string) {
  const startMark = `benchmark:${scenario}:render-start`;

  // Marking during render is normally discouraged, but this only
  // ever runs once per page load in the production preview build
  // these benchmarks target (no StrictMode double-invocation), and
  // matches the existing renderItemCalls++ pattern used elsewhere in
  // these benchmark components.

  performance.mark(startMark);

  useLayoutEffect(() => {
    const endMark = `benchmark:${scenario}:mount-end`;

    performance.mark(endMark);
    performance.measure(`${scenario}:app-mount`, startMark, endMark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
