import { buildItems } from "./build-items";

export const DYNAMIC_SMALL_ITEM_COUNT = 2_000;

export const DYNAMIC_SMALL_MIN_ROW_SIZE = 30;
export const DYNAMIC_SMALL_MAX_ROW_SIZE = 50;
export const DYNAMIC_SMALL_ESTIMATED_ROW_SIZE = 40;

export type DynamicSmallBenchmarkItem = {
  id: number;
  label: string;
  height: number;
};

/**
 * Built once, deterministically (no Math.random()), so repeated
 * benchmark runs see identical data. Kept in its own module so a
 * benchmark that doesn't render this list never pays for building it
 * -- App.tsx lazy-loads each benchmark route, so this file is only
 * evaluated when ?benchmark=dynamic-small is actually requested.
 */
export const dynamicSmallItems: DynamicSmallBenchmarkItem[] = buildItems(
  "dynamic-small",
  DYNAMIC_SMALL_ITEM_COUNT,
  (index) => ({
    id: index,
    label: `Row ${index}`,
    height:
      DYNAMIC_SMALL_MIN_ROW_SIZE +
      ((index * 17) %
        (DYNAMIC_SMALL_MAX_ROW_SIZE - DYNAMIC_SMALL_MIN_ROW_SIZE + 1)),
  }),
);
