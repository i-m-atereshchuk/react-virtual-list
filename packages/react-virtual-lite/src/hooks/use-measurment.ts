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

  const measurementStore = useMeasurmemtStore({
    listSize,
    estimatedRowHeight,
    rowHeight,
  });

  const [nativeScrollTop, setNativeScrollTop] = useState(0);

  useSyncExternalStore(measurementStore.subscribe, measurementStore.getVersion);

  const handleScroll = (container: HTMLDivElement) => {
    setNativeScrollTop(container.scrollTop);
  };

  useEffect(() => {
    return () => {
      measurementStore.disconnect();
    };
  }, []);

  const realTotal = measurementStore.getTotal();
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
    measurementStore.findNearestIndex(realScrollTop) - overcast,
    0,
  );

  const endIndex = Math.min(
    measurementStore.findNearestIndex(realScrollTop + viewPortHeight) +
      overcast,
    listSize,
  );

  const getOffset = useCallback(
    (i: number) => {
      const relativeOffset = measurementStore.getOffset(i) - realScrollTop;
      return nativeScrollTop + relativeOffset;
    },
    [nativeScrollTop, realScrollTop],
  );

  return {
    totalHeight: safeRange,
    getOffset,
    handleScroll,
    startIndex,
    endIndex,
    containerRef,
    observeRow: measurementStore.observeRow,
  };
};
