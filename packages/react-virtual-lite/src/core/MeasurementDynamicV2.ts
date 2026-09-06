import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";

import { SizeEstimator } from "./SizeEstimator";
import { TotalScrollSize } from "./TotalScrollSize";

export class MeasurementDynamicV2 implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();
  private firstInit = true;

  private pendingSizes = new Map<number, number>();

  private sizes: number[];

  private offsets: number[];

  private lastCalculatedOffset = 0;

  private maxPendingIndex = -1;

  private readonly listSize: number;

  private readonly estimatedSize: number;

  private total: TotalScrollSize;
  private sizeEstimator: SizeEstimator;

  private version = -1;

  constructor(
    listSize: number,
    sizeEstimator: SizeEstimator,
    viewPortSize: number,
    overscan: number,
  ) {
    this.listSize = listSize;
    this.sizeEstimator = sizeEstimator;

    const estimatedSize = sizeEstimator.getEstimatedSize();

    if (estimatedSize <= 0) {
      throw new Error("estimatedSize must be > 0");
    }

    this.estimatedSize = estimatedSize;

    const endRowIndex =
      listSize === 0
        ? -1
        : Math.min(
            Math.floor(viewPortSize / estimatedSize) + overscan,
            listSize - 1,
          );

    const lastSizeIndex = endRowIndex + 1;

    const initialLength = Math.max(1, lastSizeIndex + 1);

    this.sizes = new Array(initialLength).fill(estimatedSize);

    this.sizes[0] = 0;

    this.offsets = new Array(initialLength);

    this.offsets[0] = 0;

    this.total = new TotalScrollSize(listSize * estimatedSize);

    this.calculate = this.calculate.bind(this);
  }

  setRowSize(index: number, nextSize: number): boolean {
    if (this.firstInit) {
      this.firstInit = false;
      this.notify();

      return true;
    }

    if (index < 0 || index >= this.listSize || nextSize <= 0) {
      return false;
    }

    const sizeIndex = index + 1;

    const currentSize =
      this.pendingSizes.get(sizeIndex) ??
      (sizeIndex < this.sizes.length
        ? this.sizes[sizeIndex]
        : this.estimatedSize);

    if (Math.abs(currentSize - nextSize) <= 0.5) {
      return false;
    }

    this.pendingSizes.set(sizeIndex, nextSize);

    if (sizeIndex > this.maxPendingIndex) {
      this.maxPendingIndex = sizeIndex;
    }

    this.notify();

    return true;
  }

  calculate(): void {
    if (this.pendingSizes.size === 0) {
      return;
    }

    const processingSizes = this.pendingSizes;

    const endIndex = this.maxPendingIndex;

    this.pendingSizes = new Map<number, number>();

    this.maxPendingIndex = -1;

    this.materializeTo(endIndex);

    let firstChangedSizeIndex = Infinity;

    let changed = false;

    for (const [sizeIndex, nextSize] of processingSizes) {
      const previousSize = this.sizes[sizeIndex];

      if (Math.abs(previousSize - nextSize) <= 0.5) {
        continue;
      }

      this.sizes[sizeIndex] = nextSize;

      this.total.updateTotal(previousSize, nextSize);

      this.sizeEstimator.addSize(nextSize, sizeIndex);

      if (sizeIndex < firstChangedSizeIndex) {
        firstChangedSizeIndex = sizeIndex;
      }

      changed = true;
    }

    if (!changed) {
      return;
    }

    if (firstChangedSizeIndex <= this.lastCalculatedOffset) {
      this.lastCalculatedOffset = firstChangedSizeIndex - 1;
    }

    this.calculateOffsetsTo(endIndex);

    this.nextVersion();
  }

  getVersion(): number {
    return this.version;
  }

  getSize(index: number): number {
    if (index < 0 || index >= this.listSize) {
      return 0;
    }

    const sizeIndex = index + 1;

    const pending = this.pendingSizes.get(sizeIndex);

    if (pending !== undefined) {
      return pending;
    }

    if (sizeIndex >= this.sizes.length) {
      return this.estimatedSize;
    }

    return this.sizes[sizeIndex];
  }

  getOffset(index: number): number {
    if (index <= 0) {
      return 0;
    }

    const targetIndex = Math.min(index, this.listSize);

    this.materializeTo(targetIndex);

    this.calculateOffsetsTo(targetIndex);

    return this.offsets[targetIndex];
  }

  getTotal(): number {
    return this.total.getTotal();
  }

  findNearestIndex(targetOffset: number): number {
    if (this.listSize === 0 || targetOffset <= 0) {
      return 0;
    }

    this.ensureOffsetCoverage(targetOffset);

    let low = 0;

    let high = this.lastCalculatedOffset;

    let result = 0;

    while (low <= high) {
      const mid = (low + high) >>> 1;

      if (this.offsets[mid] <= targetOffset) {
        result = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.min(result, this.listSize);
  }

  subscribe(callback: () => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);
  }

  invalidateCache(): void {
    this.lastCalculatedOffset = 0;
  }

  private materializeTo(targetIndex: number): void {
    targetIndex = Math.min(targetIndex, this.listSize);

    if (targetIndex < this.sizes.length) {
      return;
    }

    const oldLength = this.sizes.length;

    const newLength = targetIndex + 1;

    this.sizes.length = newLength;

    for (let index = oldLength; index < newLength; index++) {
      this.sizes[index] = this.estimatedSize;
    }

    this.offsets.length = newLength;
  }

  private calculateOffsetsTo(targetIndex: number): void {
    targetIndex = Math.min(targetIndex, this.listSize);

    if (targetIndex <= this.lastCalculatedOffset) {
      return;
    }

    this.materializeTo(targetIndex);

    const sizes = this.sizes;

    const offsets = this.offsets;

    let currentOffset = offsets[this.lastCalculatedOffset];

    for (
      let index = this.lastCalculatedOffset + 1;
      index <= targetIndex;
      index++
    ) {
      currentOffset += sizes[index];

      offsets[index] = currentOffset;
    }

    this.lastCalculatedOffset = targetIndex;
  }

  private ensureOffsetCoverage(targetOffset: number): void {
    while (
      this.lastCalculatedOffset < this.listSize &&
      this.offsets[this.lastCalculatedOffset] <= targetOffset
    ) {
      const currentIndex = this.lastCalculatedOffset;

      const currentOffset = this.offsets[currentIndex];

      const remaining = targetOffset - currentOffset;

      const estimatedCount = Math.max(
        1,
        Math.floor(remaining / this.estimatedSize) + 1,
      );

      const endIndex = Math.min(
        this.listSize,
        currentIndex + estimatedCount + 1,
      );

      this.materializeTo(endIndex);

      this.calculateOffsetsTo(endIndex);
    }
  }

  private nextVersion(): void {
    this.version += 1;
  }

  private notify(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }
}
