import { nativeScrollToVirtual } from "./native-scroll-to-virtual";
import { MAX_SAFE_SCROLL_RANGE } from "../constants/scroll";

import { MeasurementStore } from "./MeasurementStore";

import { type SharedProps } from "../types";

export class CalculateRenderRange {
  private viewPortSize: number;
  private measurementStore: MeasurementStore;
  private overscan: number;
  private listSize: number;
  private remainingItemsThreshold: number;
  private onReachEnd: SharedProps["onReachEnd"];
  private onReachStart: SharedProps["onReachStart"];
  private onVisibleRangeChange: SharedProps["onVisibleRangeChange"];

  private hasReachedThresholdEnd = false;
  private hasReachedThresholdStart = false;
  private penndingScroll = -1;
  private prevNativeScrollTop = -1;
  private safeRange = 0;
  private nativeScrollTop = 0;
  private realScrollTop = 0;
  private version = -1;

  private frameCalcRef: ReturnType<typeof requestAnimationFrame> | null = null;

  private startIndex = -1;
  private endIndex = -1;
  private visibleStartIndex = -1;
  private visibleEndIndex = -1;

  private listeners = new Set<() => void>();

  constructor(
    viewPortSize: number,
    measurementStore: MeasurementStore,
    overscan: number,
    listSize: number,
    remainingItemsThreshold: number,
    onReachStart?: (() => void) | undefined,
    onReachEnd?: (() => void) | undefined,
    onVisibleRangeChange?:
      ((startIndex: number, endIndex: number) => void) | undefined,
  ) {
    this.viewPortSize = viewPortSize;
    this.measurementStore = measurementStore;
    this.overscan = overscan;
    this.listSize = listSize;
    this.remainingItemsThreshold = remainingItemsThreshold;
    this.onReachEnd = onReachEnd;
    this.onReachStart = onReachStart;
    this.onVisibleRangeChange = onVisibleRangeChange;
    this.updateScroll(0);
  }

  updateScroll = (scroll: number) => {
    this.penndingScroll = scroll;

    this.scheduleCalculation();
  };

  private scheduleCalculation() {
    if (this.frameCalcRef !== null) {
      return;
    }

    this.frameCalcRef = requestAnimationFrame(this.flush);
  }

  private flush = () => {
    this.frameCalcRef = null;
    const scroll = this.penndingScroll;

    this.prevNativeScrollTop = this.nativeScrollTop;
    this.nativeScrollTop = this.penndingScroll;
    const hasChanged = this.calculateIndices();

    if (hasChanged) {
      this.nextRender();
    }

    if (scroll !== this.penndingScroll) {
      this.frameCalcRef = requestAnimationFrame(this.flush);
    }
  };

  updateScrollV2 = (scroll: number) => {
    this.prevNativeScrollTop = this.nativeScrollTop;
    this.nativeScrollTop = scroll;

    this.calculateIndices();
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  getOffset = (i: number) => {
    const relativeOffset =
      this.measurementStore.getOffset(i) - this.realScrollTop;
    return this.nativeScrollTop + relativeOffset;
  };

  getVersion = () => {
    return this.version;
  };

  getStartIndex = () => {
    return this.startIndex;
  };

  updateCallbacks({
    onReachStart,
    onReachEnd,
    onVisibleRangeChange,
  }: Pick<
    SharedProps,
    "onReachEnd" | "onReachStart" | "onVisibleRangeChange"
  >) {
    this.onReachStart = onReachStart;
    this.onReachEnd = onReachEnd;
    this.onVisibleRangeChange = onVisibleRangeChange;
  }

  updateOptions({
    viewPortSize,
    overscan,
    listSize,
    remainingItemsThreshold,
  }: {
    viewPortSize: number;
    overscan: number;
    listSize: number;
    remainingItemsThreshold: number;
  }) {
    this.viewPortSize = viewPortSize;
    this.overscan = overscan;
    this.listSize = listSize;
    this.remainingItemsThreshold = remainingItemsThreshold;

    this.calculateIndices();
  }

  getScrollSafeRange() {
    return this.safeRange;
  }

  getEndIndex = () => {
    return this.endIndex;
  };

  private resetHasReachedThresholdEnd(visibleEndIndex: number) {
    if (
      this.listSize - visibleEndIndex > this.remainingItemsThreshold &&
      this.hasReachedThresholdEnd
    ) {
      this.hasReachedThresholdEnd = false;
    }
  }

  private resetHasReachedThresholdStart(visibleStartIndex: number) {
    if (
      visibleStartIndex > this.remainingItemsThreshold &&
      this.hasReachedThresholdStart
    ) {
      this.hasReachedThresholdStart = false;
    }
  }

  private handleScrollEvents(
    visibleStartIndex: number,
    visibleEndIndex: number,
  ) {
    if (this.nativeScrollTop > this.prevNativeScrollTop) {
      if (
        this.listSize - visibleEndIndex <= this.remainingItemsThreshold &&
        !this.hasReachedThresholdEnd
      ) {
        this.onReachEnd?.();
        this.hasReachedThresholdEnd = true;
      }
    } else if (this.nativeScrollTop < this.prevNativeScrollTop) {
      if (
        visibleStartIndex <= this.remainingItemsThreshold &&
        !this.hasReachedThresholdStart
      ) {
        this.onReachStart?.();
        this.hasReachedThresholdStart = true;
      }
    }
  }

  private calculateIndices() {
    const realTotal = this.measurementStore.getTotal();
    const isCompressed = realTotal > MAX_SAFE_SCROLL_RANGE;
    const safeRange = isCompressed ? MAX_SAFE_SCROLL_RANGE : realTotal;
    this.safeRange = safeRange;

    const maxRealScrollTop = Math.max(realTotal - this.viewPortSize, 0);
    const maxNativeScrollTop = Math.max(safeRange - this.viewPortSize, 0);

    const realScrollTop = isCompressed
      ? nativeScrollToVirtual(
          this.nativeScrollTop,
          maxNativeScrollTop,
          maxRealScrollTop,
        )
      : this.nativeScrollTop;

    this.realScrollTop = realScrollTop;

    const visibleStartIndex =
      this.measurementStore.findNearestIndex(realScrollTop);
    const visibleEndIndex = this.measurementStore.findNearestIndex(
      realScrollTop + this.viewPortSize,
    );

    const visibleRangeChanged =
      this.visibleStartIndex !== visibleStartIndex ||
      this.visibleEndIndex !== visibleEndIndex;

    if (visibleRangeChanged && this.measurementStore.getVersion() > -1) {
      this.onVisibleRangeChange?.(visibleStartIndex, visibleEndIndex);
      this.visibleStartIndex = visibleStartIndex;
      this.visibleEndIndex = visibleEndIndex;
    }

    this.handleScrollEvents(visibleStartIndex, visibleEndIndex);
    this.resetHasReachedThresholdStart(visibleStartIndex);
    this.resetHasReachedThresholdEnd(visibleEndIndex);

    const startIndex = Math.max(visibleStartIndex - this.overscan, 0);
    const endIndex = Math.min(
      visibleEndIndex + this.overscan + 1,
      this.listSize,
    );

    const rangeChanged =
      startIndex !== this.startIndex || this.endIndex !== endIndex;

    if (rangeChanged || isCompressed) {
      this.startIndex = startIndex;
      this.endIndex = endIndex;

      return true;
    }

    return false;
  }

  private nextRender() {
    this.version = this.version + 1;
    this.listeners.forEach((listener) => listener());
  }
}
