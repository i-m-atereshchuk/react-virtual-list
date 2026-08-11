import { useRef, useSyncExternalStore, useEffect } from "react";

import { useMeasurementStore } from "./use-measurement-store";
import { useCalculateRenderRange } from "./use-calculate-render-renge";

import { type SharedProps, type Required } from "../types";

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

  const { startIndex, endIndex, getOffset, handleScroll, totalSize } =
    useCalculateRenderRange({
      viewPortSize,
      listSize,
      overscan,
      measurementStore,
      onVisibleRangeChange,
      remainingItemsThreshold,
      onReachEnd,
      onReachStart,
    });

  useSyncExternalStore(measurementStore.subscribe, measurementStore.getVersion);

  useEffect(() => {
    return () => {
      measurementStore.disconnect();
    };
  }, []);

  return {
    totalSize,
    getOffset,
    handleScroll,
    startIndex,
    endIndex,
    containerRef,
    observeRow: measurementStore.observeRow,
  };
};
