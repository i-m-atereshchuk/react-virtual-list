import { MeasurementStore } from "./MeasurementStore";

import { ExternalStore } from "./ExternalStore";
import { MAX_SAFE_SCROLL_RANGE } from "../constants/scroll";
import { nativeScrollToVirtual } from "./native-scroll-to-virtual";
import { virtualScrollToNative } from "./virtual-scroll-to-native";

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
  measurementStore: MeasurementStore;
  viewPortSize: number;
  overscan: number;
  listSize: number;
  remainingItemsThreshold: number;
  onReachEnd?: (() => void) | undefined;
  onReachStart?: (() => void) | undefined;
  onVisibleRangeChange?:
    ((startIndex: number, endIndex: number) => void) | undefined;
};

export class CalculateRenderRange extends ExternalStore {
  private prevScroll = 0;
  private scroll = 0;
  private pendingScroll = 0;
  private realScrollTop = 0;
  private isRecalculationRequired = false;

  private visibleStartIndex = -1;
  private visibleEndIndex = -1;

  private startIndex = -1;
  private endIndex = -1;

  private safeRange = 0;

  private frameRef: ReturnType<typeof requestAnimationFrame> | null = null;

  private measurementStore: MeasurementStore;
  private viewPortSize: number;
  private overscan: number;
  private listSize: number;
  private remainingItemsThreshold: number;
  private onReachEnd?: (() => void) | undefined;
  private onReachStart?: (() => void) | undefined;
  private onVisibleRangeChange?:
    ((startIndex: number, endIndex: number) => void) | undefined;

  constructor({
    viewPortSize,
    overscan,
    listSize,
    onReachEnd,
    onReachStart,
    onVisibleRangeChange,
    measurementStore,
    remainingItemsThreshold,
  }: InitCalculateRenderRange) {
    super();
    this.viewPortSize = viewPortSize;
    this.overscan = overscan;
    this.listSize = listSize;
    this.onReachEnd = onReachEnd;
    this.onReachStart = onReachStart;
    this.onVisibleRangeChange = onVisibleRangeChange;
    this.remainingItemsThreshold = remainingItemsThreshold;
    this.handleScroll = this.handleScroll.bind(this);
    this.handleMeasurementStoreChanged =
      this.handleMeasurementStoreChanged.bind(this);
    this.schedulerNextUpdate = this.schedulerNextUpdate.bind(this);

    this.measurementStore = measurementStore;
    this.measurementStore.subscribe(this.handleMeasurementStoreChanged);
    this.getOffset = this.getOffset.bind(this);
    this.getScrollOffsetByIndex = this.getScrollOffsetByIndex.bind(this);

    this.handleScroll(0);
  }

  handleScroll(scroll: number) {
    this.pendingScroll = scroll;

    if (this.frameRef === null) {
      this.frameRef = requestAnimationFrame(this.schedulerNextUpdate);
    }
  }

  private schedulerNextUpdate() {
    this.frameRef = null;
    this.isRecalculationRequired = false;

    this.prevScroll = this.scroll;
    this.scroll = this.pendingScroll;

    const calculateNextUpdateResult = this.calculateNextUpdate();

    if (calculateNextUpdateResult.changed) {
      this.nextVersion();
    }

    if (
      calculateNextUpdateResult.visibleChanged &&
      this.measurementStore.getVersion() > -1
    ) {
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

    if (this.pendingScroll !== this.scroll || this.isRecalculationRequired) {
      this.isRecalculationRequired = false;
      this.frameRef = requestAnimationFrame(this.schedulerNextUpdate);
    }
  }

  private calculateNextUpdate() {
    const realTotalSize = this.measurementStore.getTotal();
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

    this.visibleStartIndex = this.measurementStore.findNearestIndex(
      this.realScrollTop,
    );
    this.visibleEndIndex = this.measurementStore.findNearestIndex(
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

  getOffset(i: number) {
    const relativeOffset =
      this.measurementStore.getOffset(i) - this.realScrollTop;

    return this.scroll + relativeOffset;
  }

  uppdateProperties({
    viewPortSize,
    overscan,
    listSize,
    remainingItemsThreshold,
  }: UppdateProperties) {
    this.viewPortSize = viewPortSize;
    this.overscan = overscan;
    this.listSize = listSize;
    this.remainingItemsThreshold = remainingItemsThreshold;

    this.isRecalculationRequired = true;

    if (this.frameRef === null) {
      this.frameRef = requestAnimationFrame(this.schedulerNextUpdate);
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

  private handleMeasurementStoreChanged() {
    this.isRecalculationRequired = true;
    if (this.frameRef === null) {
      this.frameRef = requestAnimationFrame(this.schedulerNextUpdate);
    }
  }

  destroy() {
    this.measurementStore.unsubscribe(this.handleMeasurementStoreChanged);
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

  getScrollOffsetByIndex(index: number) {
    const realTotalSize = this.measurementStore.getTotal();
    const itemOffset = this.measurementStore.getOffset(index);

    const isCompressed = realTotalSize > MAX_SAFE_SCROLL_RANGE;

    if (!isCompressed) {
      return itemOffset;
    }

    const safeRange = MAX_SAFE_SCROLL_RANGE;

    const maxVirtualScrollTop = Math.max(realTotalSize - this.viewPortSize, 0);

    const maxNativeScrollTop = Math.max(safeRange - this.viewPortSize, 0);

    return virtualScrollToNative(
      itemOffset,
      maxNativeScrollTop,
      maxVirtualScrollTop,
    );
  }
}
