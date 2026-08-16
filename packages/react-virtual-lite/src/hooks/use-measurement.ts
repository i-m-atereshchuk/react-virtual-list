import { useRef, useEffect } from "react";

import { useMeasurementStore } from "./use-measurement-store";

import { type SharedProps, type Required } from "../types/List";

import { useCalculateRenderRange } from "./use-calculate-render-range";

type UseMeasurmentOptions = {
  listSize: number;
  viewPortSize: number;
  estimatedRowSize: number;
} & Required<
  SharedProps,
  "overscan" | "estimatedRowSize" | "orientation" | "remainingItemsThreshold"
> &
  Pick<
    SharedProps,
    "rowSize" | "onVisibleRangeChange" | "onReachEnd" | "onReachStart"
  >;

export const useMeasurement = ({
  listSize,
  overscan,
  viewPortSize,
  rowSize,
  estimatedRowSize,
  orientation,
  onVisibleRangeChange,
  remainingItemsThreshold,
  onReachEnd,
  onReachStart,
}: UseMeasurmentOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const measurementStore = useMeasurementStore({
    listSize,
    rowSize,
    estimatedRowSize,
    orientation,
  });

  const calculateRenderRange = useCalculateRenderRange({
    measurement: measurementStore,
    viewPortSize,
    overscan,
    listSize,
    remainingItemsThreshold,
    onReachEnd,
    onReachStart,
    onVisibleRangeChange,
  });

  useEffect(() => {
    return () => {
      measurementStore.disconnect();
    };
  }, []);

  return {
    totalSize: calculateRenderRange.getSafeRange(),
    getOffset: calculateRenderRange.getOffset,
    handleScroll: calculateRenderRange.handleScroll,
    startIndex: calculateRenderRange.getStartIndex(),
    endIndex: calculateRenderRange.getEndIndex(),
    containerRef,
    observeRow: measurementStore.observeRow,
    calculateRenderRange,
  };
};
