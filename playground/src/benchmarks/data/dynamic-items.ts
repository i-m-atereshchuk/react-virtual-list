import { buildItems } from "./build-items";

export const DYNAMIC_ITEM_COUNT = 50_000;

export const DYNAMIC_MIN_ROW_SIZE = 30;
export const DYNAMIC_MAX_ROW_SIZE = 50;
export const DYNAMIC_ESTIMATED_ROW_SIZE = 40;

export type DynamicBenchmarkItem = {
  id: number;
  label: string;
  height: number;
};

/**
 * Built once, deterministically (no Math.random()), so repeated
 * benchmark runs see identical data. Kept in its own module so a
 * benchmark that doesn't render this list never pays for building it
 * -- App.tsx lazy-loads each benchmark route, so this file is only
 * evaluated when ?benchmark=dynamic is actually requested.
 */
export const dynamicItems: DynamicBenchmarkItem[] = buildItems(
  "dynamic",
  DYNAMIC_ITEM_COUNT,
  (index) => ({
    id: index,
    label: `Row ${index}`,
    height:
      DYNAMIC_MIN_ROW_SIZE +
      ((index * 17) % (DYNAMIC_MAX_ROW_SIZE - DYNAMIC_MIN_ROW_SIZE + 1)),
  }),
);
