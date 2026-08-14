import { useState, useSyncExternalStore, useEffect } from "react";

import { CalculateRenderRange } from "../utils/CalculateRenderRange";
import { MeasurementStore } from "../utils/MeasurementStore";

type UseCalculateRenderRangeOptions = {
  measurement: MeasurementStore;
  viewPortSize: number;
  overscan: number;
  listSize: number;
  remainingItemsThreshold: number;
  onReachEnd?: (() => void) | undefined;
  onReachStart?: (() => void) | undefined;
  onVisibleRangeChange?:
    ((startIndex: number, endIndex: number) => void) | undefined;
};

export const useCalculateRenderRange = ({
  measurement,
  viewPortSize,
  overscan,
  listSize,
  remainingItemsThreshold,
  onReachEnd,
  onReachStart,
  onVisibleRangeChange,
}: UseCalculateRenderRangeOptions) => {
  const [calculateRenderRange] = useState(
    () =>
      new CalculateRenderRange({
        measurementStore: measurement,
        viewPortSize,
        overscan,
        listSize,
        onReachEnd,
        onReachStart,
        onVisibleRangeChange,
        remainingItemsThreshold,
      }),
  );

  useSyncExternalStore(
    calculateRenderRange.subscribe,
    calculateRenderRange.getVersion,
  );

  useEffect(() => {
    return () => {
      calculateRenderRange.destroy();
    };
  }, []);

  useEffect(() => {
    calculateRenderRange.uppdateProperties({
      viewPortSize,
      overscan,
      listSize,
      remainingItemsThreshold,
    });
  }, [viewPortSize, overscan, listSize, remainingItemsThreshold]);

  useEffect(() => {
    calculateRenderRange.uppdateCallbacks({
      onReachEnd,
      onReachStart,
      onVisibleRangeChange,
    });
  }, [onReachEnd, onReachEnd, onVisibleRangeChange]);

  return {
    handleScroll: calculateRenderRange.handleScroll,
    safeRange: calculateRenderRange.getSafeRange(),
    startIndex: calculateRenderRange.getStartIndex(),
    endIndex: calculateRenderRange.getEndIndex(),
    getOffset: calculateRenderRange.getOffset,
  };
};
