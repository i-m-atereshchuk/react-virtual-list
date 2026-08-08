import {
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
  useEffect,
} from "react";

import { nativeScrollToVirtual } from "../utils/native-scroll-to-virtual";
import { MAX_SAFE_SCROLL_RANGE } from "../constants/scroll";

import { useMeasurmemtStore } from "./use-measurment-store";

import { type SharedProps, type Required } from "../types";

type UseMeasurmentOptions = {
  listSize: number;
  viewPortSize: number;
  estimatedRowSize: number;
} & Required<SharedProps, "overcast" | "estimatedRowSize" | "orientation"> &
  Pick<SharedProps, "rowSize" | "onVisibleRangeChange">;

export const useMeasurment = ({
  listSize,
  overcast,
  viewPortSize,
  rowSize,
  estimatedRowSize,
  orientation,
  onVisibleRangeChange,
}: UseMeasurmentOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const measurementStore = useMeasurmemtStore({
    listSize,
    rowSize,
    estimatedRowSize,
    orientation,
  });

  const [nativeScrollTop, setNativeScrollTop] = useState(0);

  useSyncExternalStore(measurementStore.subscribe, measurementStore.getVersion);

  const handleScroll = (scroll: number) => {
    setNativeScrollTop(scroll);
  };

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

  const startIndex = Math.max(visibleStartIndex - overcast, 0);
  const endIndex = Math.min(visibleEndIndex + overcast, listSize);

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
