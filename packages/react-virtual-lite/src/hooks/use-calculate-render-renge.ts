import { useState, useEffect, useSyncExternalStore } from "react";

import { CalculateRenderRange } from "../utils/CalculateRenderRenge";
import { MeasurementStore } from "../utils/MeasurementStore";

import { type SharedProps, type Required } from "../types";

type UseCalculateRenderRangeOptions = {
  viewPortSize: number;
  measurementStore: MeasurementStore;
  overscan: number;
  listSize: number;
} & Required<SharedProps, "remainingItemsThreshold"> &
  Pick<SharedProps, "onVisibleRangeChange" | "onReachEnd" | "onReachStart">;

export const useCalculateRenderRange = ({
  viewPortSize,
  listSize,
  overscan,
  measurementStore,
  remainingItemsThreshold,
  onReachStart,
  onReachEnd,
  onVisibleRangeChange,
}: UseCalculateRenderRangeOptions) => {
  const [calculateRenderRange] = useState(
    () =>
      new CalculateRenderRange(
        viewPortSize,
        measurementStore,
        overscan,
        listSize,
        remainingItemsThreshold,
        onReachStart,
        onReachEnd,
        onVisibleRangeChange,
      ),
  );

  useEffect(() => {
    calculateRenderRange.updateOptions({
      listSize,
      remainingItemsThreshold,
      overscan,
      viewPortSize,
    });
  }, [listSize, remainingItemsThreshold, overscan, viewPortSize]);

  useEffect(() => {
    calculateRenderRange.updateCallbacks({
      onReachEnd,
      onReachStart,
      onVisibleRangeChange,
    });
  }, [onReachEnd, onReachEnd, onVisibleRangeChange]);

  useSyncExternalStore(
    calculateRenderRange.subscribe,
    calculateRenderRange.getVersion,
  );

  const startIndex = calculateRenderRange.getStartIndex();
  const endIndex = calculateRenderRange.getEndIndex();

  return {
    startIndex,
    endIndex,
    totalSize: calculateRenderRange.getScrollSafeRange(),
    getOffset: calculateRenderRange.getOffset,
    handleScroll: calculateRenderRange.updateScroll,
  };
};
