import type { CalculationNode } from "../types/CalculationNode";

import type { Measurement } from "../types/Measurement";

import { MAX_SAFE_SCROLL_RANGE } from "../constants/scroll";
import { nativeScrollToVirtual } from "../utils/native-scroll-to-virtual";
import { virtualScrollToNative } from "../utils/virtual-scroll-to-native";

type UppdateProperties = {
  viewPortSize: number;
  overscan: number;
  listSize: number;
  remainingItemsThreshold: number;
};

type UppdateCallbacks = {
  onReachEnd?: (() => void) | undefined;
  onReachStart?: (() => void) | undefined;
  onVisibleRangeChange?:
    ((startIndex: number, endIndex: number) => void) | undefined;
};

type InitCalculateRenderRange = {
  measurement: Measurement;
  viewPortSize: number;
  overscan: number;
  listSize: number;
  remainingItemsThreshold: number;
  onReachEnd?: (() => void) | undefined;
  onReachStart?: (() => void) | undefined;
  onVisibleRangeChange?:
    ((startIndex: number, endIndex: number) => void) | undefined;
};

export class CalculateRenderRange implements CalculationNode {
  private prevScroll = 0;
  private scroll = -1;
  private pendingScroll = 0;
  private realScrollTop = 0;

  private listeners = new Set<() => void>();

  private visibleStartIndex = -1;
  private visibleEndIndex = -1;

  private startIndex = -1;
  private endIndex = -1;

  private safeRange = 0;

  private propertiesDirty = true;

  private measurement: Measurement;
  private measurementVersion: number;
  private viewPortSize: number;
  private overscan: number;
  private listSize: number;
  private remainingItemsThreshold: number;
  private onReachEnd?: (() => void) | undefined;
  private onReachStart?: (() => void) | undefined;
  private onVisibleRangeChange?:
    ((startIndex: number, endIndex: number) => void) | undefined;

  constructor({
    measurement,
    viewPortSize,
    overscan,
    listSize,
    onReachEnd,
    onReachStart,
    onVisibleRangeChange,
    remainingItemsThreshold,
  }: InitCalculateRenderRange) {
    this.measurement = measurement;
    this.measurementVersion = measurement.getVersion();
    this.viewPortSize = viewPortSize;
    this.overscan = overscan;
    this.listSize = listSize;
    this.onReachEnd = onReachEnd;
    this.onReachStart = onReachStart;
    this.onVisibleRangeChange = onVisibleRangeChange;
    this.remainingItemsThreshold = remainingItemsThreshold;

    this.calculate = this.calculate.bind(this);
    this.getOffset = this.getOffset.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.getOffset = this.getOffset.bind(this);
    this.getScrollOffsetByIndex = this.getScrollOffsetByIndex.bind(this);
    this.calculate();
  }

  handleScroll(scroll: number) {
    this.pendingScroll = scroll;
    this.notify();
  }

  calculate(): void {
    const nextMeasurementVersion = this.measurement.getVersion();

    const measurementChanged =
      nextMeasurementVersion !== this.measurementVersion;

    const scrollChanged = this.pendingScroll !== this.scroll;
    const propertiesChanged = this.propertiesDirty;

    if (!measurementChanged && !scrollChanged && !propertiesChanged) {
      return;
    }

    this.prevScroll = this.scroll;
    this.scroll = this.pendingScroll;

    this.measurementVersion = nextMeasurementVersion;
    this.propertiesDirty = false;

    const calculatedRange = this.calculateRange();

    if (calculatedRange.visibleChanged) {
      this.onVisibleRangeChange?.(this.visibleStartIndex, this.visibleEndIndex);
    }

    if (
      this.prevScroll > this.scroll &&
      this.visibleStartIndex <= this.remainingItemsThreshold
    ) {
      this.onReachStart?.();
    }

    if (
      this.prevScroll < this.scroll &&
      this.listSize - this.visibleEndIndex <= this.remainingItemsThreshold
    ) {
      this.onReachEnd?.();
    }
  }

  getOffset(i: number) {
    const relativeOffset = this.measurement.getOffset(i) - this.realScrollTop;

    return this.scroll + relativeOffset;
  }

  subscribe(callback: () => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);
  }

  uppdateProperties({
    viewPortSize,
    overscan,
    listSize,
    remainingItemsThreshold,
  }: UppdateProperties) {
    const layoutChanged =
      this.viewPortSize !== viewPortSize ||
      this.overscan !== overscan ||
      this.listSize !== listSize;

    this.viewPortSize = viewPortSize;
    this.overscan = overscan;
    this.listSize = listSize;

    this.remainingItemsThreshold = remainingItemsThreshold;

    if (layoutChanged) {
      this.propertiesDirty = true;
      this.notify();
    }
  }

  uppdateCallbacks({
    onReachEnd,
    onReachStart,
    onVisibleRangeChange,
  }: UppdateCallbacks) {
    this.onReachEnd = onReachEnd;
    this.onReachStart = onReachStart;
    this.onVisibleRangeChange = onVisibleRangeChange;
  }

  getStartIndex() {
    return this.startIndex;
  }

  getEndIndex() {
    return this.endIndex;
  }

  getVisibleStartIndex() {
    return this.visibleStartIndex;
  }

  getVisibleEndIndex() {
    return this.visibleEndIndex;
  }

  getSafeRange() {
    return this.safeRange;
  }

  getIndexByOffset(offset: number) {
    return this.measurement.findNearestIndex(offset);
  }

  getScrollOffsetByIndex(index: number) {
    const virtualOffset = this.measurement.getOffset(index);

    return this.getNativeScrollOffset(virtualOffset);
  }

  getMeasurementVersion() {
    return this.measurement.getVersion();
  }

  getNativeScrollOffset(virtualOffset: number) {
    const realTotalSize = this.measurement.getTotal();
    const isCompressed = realTotalSize > MAX_SAFE_SCROLL_RANGE;

    if (!isCompressed) {
      return virtualOffset;
    }

    const maxVirtualScrollTop = Math.max(realTotalSize - this.viewPortSize, 0);

    const maxNativeScrollTop = Math.max(
      MAX_SAFE_SCROLL_RANGE - this.viewPortSize,
      0,
    );

    return virtualScrollToNative(
      virtualOffset,
      maxNativeScrollTop,
      maxVirtualScrollTop,
    );
  }

  private calculateRange() {
    const realTotalSize = this.measurement.getTotal();
    const isCompressed = realTotalSize > MAX_SAFE_SCROLL_RANGE;
    const safeRange = isCompressed ? MAX_SAFE_SCROLL_RANGE : realTotalSize;
    this.safeRange = safeRange;

    const maxRealScrollTop = Math.max(realTotalSize - this.viewPortSize, 0);
    const maxNativeScrollTop = Math.max(safeRange - this.viewPortSize, 0);
    this.realScrollTop = isCompressed
      ? nativeScrollToVirtual(this.scroll, maxNativeScrollTop, maxRealScrollTop)
      : this.scroll;

    const [prevVisibleStartIndex, prevVisibleEndIndex] = [
      this.visibleStartIndex,
      this.visibleEndIndex,
    ];

    const [prevStartIndexx, prevEndIndex] = [this.startIndex, this.endIndex];

    this.visibleStartIndex = this.measurement.findNearestIndex(
      this.realScrollTop,
    );
    this.visibleEndIndex = this.measurement.findNearestIndex(
      this.realScrollTop + this.viewPortSize,
    );

    this.startIndex = Math.max(this.visibleStartIndex - this.overscan, 0);
    this.endIndex = Math.min(
      this.visibleEndIndex + this.overscan + 1,
      this.listSize,
    );

    const rangeCnaged =
      prevStartIndexx !== this.startIndex || prevEndIndex !== this.endIndex;

    const visibleChanged =
      prevVisibleStartIndex !== this.visibleStartIndex ||
      prevVisibleEndIndex !== this.visibleEndIndex;

    const changed = isCompressed || visibleChanged || rangeCnaged;

    return {
      changed,
      visibleChanged,
    };
  }

  private notify() {
    for (const callback of this.listeners) {
      callback();
    }
  }
}
