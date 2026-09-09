import { buildItems } from "./build-items";

export const FIXED_ITEM_COUNT = 50_000;
export const FIXED_ROW_SIZE = 40;

export type FixedBenchmarkItem = {
  id: number;
  label: string;
};

/**
 * Built once, deterministically (no Math.random()), so repeated
 * benchmark runs see identical data. Kept in its own module so a
 * benchmark that doesn't render this list never pays for building it
 * -- App.tsx lazy-loads each benchmark route, so this file is only
 * evaluated when ?benchmark=fixed is actually requested.
 */
export const fixedItems: FixedBenchmarkItem[] = buildItems(
  "fixed",
  FIXED_ITEM_COUNT,
  (index) => ({
    id: index,
    label: `Row ${index}`,
  }),
);
