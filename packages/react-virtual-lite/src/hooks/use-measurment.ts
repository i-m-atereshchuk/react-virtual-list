import { useRef, useState, useCallback, useReducer } from "react";

import { MeasurementDynamic } from "../utils/MeasurementDynamic";
import { MeasurementStatic } from "../utils/MeasurementStatic";

import { nativeScrollToVirtual } from "../utils/native-scroll-to-virtual";
import { MAX_SAFE_SCROLL_RANGE } from "../constants/scroll";

type UseMeasurmentOptions = {
  estimatedRowHeight?: number | undefined;
  rowHeight?: number | undefined;
  overcast: number;
  listSize: number;
  viewPortHeight: number;
};

export const useMeasurment = ({
  listSize,
  rowHeight,
  overcast,
  viewPortHeight,
  estimatedRowHeight,
}: UseMeasurmentOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measurement] = useState(() => {
    if (typeof rowHeight === "number") {
      return new MeasurementStatic(listSize, rowHeight);
    }

    return new MeasurementDynamic(listSize, estimatedRowHeight);
  });

  const [, forceLayout] = useReducer((value) => value + 1, 0);
  const [nativeScrollTop, setNativeScrollTop] = useState(0);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(
    null,
  );

  function scheduleLayout() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      forceLayout();
    });
  }

  const handleHeightChange = useCallback((height: number, index: number) => {
    const hasChanged = measurement.setRowHeight(index, height);
    if (!hasChanged) return;
    scheduleLayout();
  }, []);

  const handleScroll = (container: HTMLDivElement) => {
    setNativeScrollTop(container.scrollTop);
  };

  const realTotal = measurement.getTotal();
  const isCompressed = realTotal > MAX_SAFE_SCROLL_RANGE;
  const safeRange = isCompressed ? MAX_SAFE_SCROLL_RANGE : realTotal;

  const maxRealScrollTop = Math.max(realTotal - viewPortHeight, 0);
  const maxNativeScrollTop = Math.max(safeRange - viewPortHeight, 0);

  const realScrollTop = isCompressed
    ? nativeScrollToVirtual(
        nativeScrollTop,
        maxNativeScrollTop,
        maxRealScrollTop,
      )
    : nativeScrollTop;

  const startIndex = Math.max(
    measurement.findNearestIndex(realScrollTop) - overcast,
    0,
  );

  const endIndex = Math.min(
    measurement.findNearestIndex(realScrollTop + viewPortHeight) + overcast,
    listSize,
  );

  const getOffset = useCallback(
    (i: number) => {
      const relativeOffset = measurement.getOffset(i) - realScrollTop;
      return nativeScrollTop + relativeOffset;
    },
    [nativeScrollTop, realScrollTop],
  );

  return {
    totalHeight: safeRange,
    getOffset,
    handleHeightChange,
    handleScroll,
    startIndex,
    endIndex,
    containerRef,
  };
};
