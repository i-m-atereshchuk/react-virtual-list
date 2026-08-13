import {
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
  useEffect,
} from "react";

import { nativeScrollToVirtual } from "../utils/native-scroll-to-virtual";
import { MAX_SAFE_SCROLL_RANGE } from "../constants/scroll";

import { useMeasurementStore } from "./use-measurement-store";

import { type SharedProps, type Required } from "../types/List";

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
  const hasReachedThresholdEnd = useRef(false);
  const hasReachedThresholdStart = useRef(false);

  const measurementStore = useMeasurementStore({
    listSize,
    rowSize,
    estimatedRowSize,
    orientation,
  });

  const [nativeScrollTop, setNativeScrollTop] = useState(0);
  useSyncExternalStore(measurementStore.subscribe, measurementStore.getVersion);

  useEffect(() => {
    return () => {
      measurementStore.disconnect();
    };
  }, []);

  const realTotal = measurementStore.getTotal();
  const isCompressed = realTotal > MAX_SAFE_SCROLL_RANGE;
  const safeRange = isCompressed ? MAX_SAFE_SCROLL_RANGE : realTotal;

  const maxRealScrollTop = Math.max(realTotal - viewPortSize, 0);
  const maxNativeScrollTop = Math.max(safeRange - viewPortSize, 0);

  const realScrollTop = isCompressed
    ? nativeScrollToVirtual(
        nativeScrollTop,
        maxNativeScrollTop,
        maxRealScrollTop,
      )
    : nativeScrollTop;

  const visibleStartIndex = measurementStore.findNearestIndex(realScrollTop);
  const visibleEndIndex = measurementStore.findNearestIndex(
    realScrollTop + viewPortSize,
  );

  const startIndex = Math.max(visibleStartIndex - overscan, 0);
  const endIndex = Math.min(visibleEndIndex + overscan, listSize);

  const getOffset = useCallback(
    (i: number) => {
      const relativeOffset = measurementStore.getOffset(i) - realScrollTop;
      return nativeScrollTop + relativeOffset;
    },
    [nativeScrollTop, realScrollTop],
  );

  useEffect(() => {
    if (measurementStore.getVersion() > -1) {
      onVisibleRangeChange?.(visibleStartIndex, visibleEndIndex);
    }
  }, [visibleStartIndex, visibleEndIndex]);

  const handleScroll = (scroll: number) => {
    setNativeScrollTop(scroll);

    if (scroll > nativeScrollTop) {
      if (
        listSize - visibleEndIndex <= remainingItemsThreshold &&
        !hasReachedThresholdEnd.current
      ) {
        onReachEnd?.();
        hasReachedThresholdEnd.current = true;
      }
    } else if (scroll < nativeScrollTop) {
      if (
        visibleStartIndex <= remainingItemsThreshold &&
        !hasReachedThresholdStart.current
      ) {
        onReachStart?.();
        hasReachedThresholdStart.current = true;
      }
    }
  };

  useEffect(() => {
    if (
      visibleStartIndex > remainingItemsThreshold &&
      hasReachedThresholdStart.current
    ) {
      hasReachedThresholdStart.current = false;
    }
  }, [visibleStartIndex, remainingItemsThreshold]);

  useEffect(() => {
    if (
      listSize - visibleEndIndex > remainingItemsThreshold &&
      hasReachedThresholdEnd.current
    ) {
      hasReachedThresholdEnd.current = false;
    }
  }, [visibleEndIndex, remainingItemsThreshold]);

  return {
    totalSize: safeRange,
    getOffset,
    handleScroll,
    startIndex,
    endIndex,
    containerRef,
    observeRow: measurementStore.observeRow,
  };
};
