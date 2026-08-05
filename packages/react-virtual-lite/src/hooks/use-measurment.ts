import { useRef, useState, useCallback, useReducer, useMemo } from "react";

import { Measurement } from "../utils/Measurement";

type UseMeasurmentOptions = {
  initRowHeight: number;
  overcast: number;
  listSize: number;
  viewPortHeight: number;
};

const MAX_HEIGHT = 8_000_000;

export const useMeasurment = ({
  listSize,
  initRowHeight,
  overcast,
  viewPortHeight,
}: UseMeasurmentOptions) => {
  const [measurement] = useState(
    () => new Measurement(listSize, initRowHeight),
  );

  const [, forceLayout] = useReducer((value) => value + 1, 0);
  const [scrollTop, setScrollTop] = useState(0);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(
    null,
  );

  function scheduleLayout() {
    if (frameRef.current) {
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;

      forceLayout();
    });
  }

  const handleHeightChange = useCallback((height: number, index: number) => {
    const hasChanged = measurement.setRowHeight(index, height);

    if (!hasChanged) {
      return;
    }

    scheduleLayout();
  }, []);

  const handleScroll = (container: HTMLDivElement) => {
    const top = container.scrollTop;

    setScrollTop(top);
  };

  const startIndex = Math.max(
    measurement.findNearestIndex(scrollTop) - overcast,
    0,
  );

  const endIndex = Math.min(
    measurement.findNearestIndex(scrollTop + viewPortHeight) + overcast,
    listSize,
  );

  const scrollHeight = measurement.getTotal();

  const totalHeights = useMemo(() => {
    const heights: number[] = [];

    let remaining = scrollHeight;

    while (remaining > 0) {
      const nextHeight = Math.min(MAX_HEIGHT, remaining);

      heights.push(nextHeight);

      remaining -= nextHeight;
    }

    return heights;
  }, [scrollHeight]);

  return {
    totalHeights,
    getOffset: (i: number) => measurement.getOffset(i),
    handleHeightChange,
    handleScroll,
    scrollTop,
    startIndex,
    endIndex,
  };
};
