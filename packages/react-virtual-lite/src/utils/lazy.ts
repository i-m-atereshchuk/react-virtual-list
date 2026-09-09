import { LAZY_MEASUREMENT_SIZE_RATIO } from "../constants/lazy";

export function getRenderRangeSize(
  listSize: number,
  viewPortSize: number,
  estimatedRowSize: number,
  overscan: number,
): number {
  return (
    Math.min(
      Math.floor(viewPortSize / estimatedRowSize) + overscan,
      listSize - 1,
    ) + 1
  );
}

export function shouldUseLazyMeasurement(
  listSize: number,
  renderRangeSize: number,
): boolean {
  return listSize > renderRangeSize * LAZY_MEASUREMENT_SIZE_RATIO;
}
