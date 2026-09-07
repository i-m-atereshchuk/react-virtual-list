import { useState, useSyncExternalStore, useEffect } from "react";

// import { SizeEstimator } from "../core/SizeEstimator";
import { MeasurementStatic } from "../core/MeasurementStatic";
// import { MeasurementDynamic } from "../core/MeasurementDynamic";
import { MeasurementDynamicLazy } from "../core/MeasurementDynamicLazy";
import { MeasurementStore } from "../core/MeasurementStore";
import { CalculateRenderRange } from "../core/CalculateRenderRange";
import { FrameScheduler } from "../core/FrameScheduler";

import { type SharedProps, type Required } from "../types/List";

type UseVirtualizedOptions = {
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

export const useVirtualized = ({
  rowSize,
  listSize,
  estimatedRowSize,
  orientation,
  viewPortSize,
  overscan,
  onReachEnd,
  onReachStart,
  onVisibleRangeChange,
  remainingItemsThreshold,
}: UseVirtualizedOptions) => {
  // const [measurement] = useState(() => {
  //   return typeof rowSize === "number"
  //     ? new MeasurementStatic(listSize, rowSize)
  //     : new MeasurementDynamic(listSize, new SizeEstimator(estimatedRowSize));
  // });
  const [measurement] = useState(() => {
    return typeof rowSize === "number"
      ? new MeasurementStatic(listSize, rowSize)
      : new MeasurementDynamicLazy(
          listSize,
          viewPortSize,
          estimatedRowSize,
          overscan,
        );
  });

  const [measurementStore] = useState(() => {
    return new MeasurementStore(measurement, orientation, rowSize);
  });

  const [calculateRenderRange] = useState(() => {
    return new CalculateRenderRange({
      measurement,
      viewPortSize,
      overscan,
      listSize,
      onReachEnd,
      onReachStart,
      onVisibleRangeChange,
      remainingItemsThreshold,
    });
  });

  const [frameScheduler] = useState(() => {
    return new FrameScheduler([measurement, calculateRenderRange]);
  });

  useSyncExternalStore(frameScheduler.subscribe, frameScheduler.getVersion);

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

  useEffect(() => {
    frameScheduler.connect();

    return () => {
      frameScheduler.disconnect();
    };
  }, []);

  return {
    totalSize: calculateRenderRange.getSafeRange(),
    getOffset: calculateRenderRange.getOffset,
    handleScroll: calculateRenderRange.handleScroll,
    startIndex: calculateRenderRange.getStartIndex(),
    endIndex: calculateRenderRange.getEndIndex(),
    observeRow: measurementStore.observeRow,
    renderRange: calculateRenderRange,
  };
};
