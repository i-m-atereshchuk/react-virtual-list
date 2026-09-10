import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";

import {
  fenwickAdd,
  fenwickFindByPrefixSum,
  fenwickHighestBit,
  fenwickRebuildRange,
  fenwickSum,
} from "./FenwickTree";
import { TotalScrollSize } from "./TotalScrollSize";

export class MeasurementDynamicLazy implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();

  private pendingSizes = new Map<number, number>();

  private processingSizes = new Map<number, number>();

  private offsets: number[];

  private sizes: number[];

  private calculatedOffsets: number[];

  private total: TotalScrollSize;

  private readonly estimatedSize: number;

  private listSize: number;

  private materializedTotal = 0;

  private lastMeasuredIndex = -1;

  private version = -1;

  private highestBit = 0;

  constructor(
    listSize: number,
    viewPortSize: number,
    estimatedSize: number,
    overscan: number,
  ) {
    this.listSize = listSize;
    this.estimatedSize = estimatedSize;

    const endIndex = Math.min(
      Math.floor(viewPortSize / estimatedSize) + overscan,
      listSize - 1,
    );

    const initialLength = endIndex + 2;

    this.sizes = new Array(initialLength).fill(estimatedSize);
    this.sizes[0] = 0;

    this.offsets = new Array(initialLength).fill(0);

    this.calculatedOffsets = new Array(initialLength).fill(0);

    this.total = new TotalScrollSize(listSize * estimatedSize);

    this.materializedTotal = (initialLength - 1) * estimatedSize;

    this.calculate = this.calculate.bind(this);

    this.initOffsets();
    this.updateHighestBit();
  }

  setRowSize(index: number, nextSize: number): boolean {
    if (
      index < 0 ||
      index >= this.listSize ||
      nextSize < 0 ||
      !Number.isFinite(nextSize)
    ) {
      return false;
    }

    const treeIndex = index + 1;

    const committedSize =
      treeIndex < this.sizes.length
        ? this.sizes[treeIndex]
        : this.estimatedSize;

    const currentSize = this.pendingSizes.get(treeIndex) ?? committedSize;

    if (Math.abs(currentSize - nextSize) <= 0.5 && this.version > -1) {
      return false;
    }

    if (Math.abs(committedSize - nextSize) <= 0.5) {
      this.pendingSizes.delete(treeIndex);
    } else {
      this.pendingSizes.set(treeIndex, nextSize);
    }

    this.notify();

    return true;
  }

  calculate(): void {
    if (this.pendingSizes.size === 0) {
      return;
    }

    const processingSizes = this.pendingSizes;

    this.pendingSizes = this.processingSizes;
    this.processingSizes = processingSizes;

    this.pendingSizes.clear();

    let maxIndex = -1;

    for (const treeIndex of processingSizes.keys()) {
      if (treeIndex > maxIndex) {
        maxIndex = treeIndex;
      }
    }

    if (maxIndex >= 0) {
      this.prefill(maxIndex);
    }

    for (const [treeIndex, rowSize] of processingSizes) {
      const prevSize = this.sizes[treeIndex];

      const difference = rowSize - prevSize;

      if (Math.abs(difference) <= 0.5) {
        continue;
      }

      this.sizes[treeIndex] = rowSize;

      this.add(treeIndex, difference);

      this.total.updateTotal(prevSize, rowSize);

      this.materializedTotal += difference;

      this.lastMeasuredIndex = Math.min(this.lastMeasuredIndex, treeIndex - 1);
    }

    processingSizes.clear();

    this.nextVersion();
  }

  findNearestIndex(offset: number): number {
    if (
      offset > this.materializedTotal &&
      this.offsets.length < this.listSize + 1
    ) {
      const difference = offset - this.materializedTotal;

      const additionalRows = Math.floor(difference / this.estimatedSize);

      if (additionalRows > 0) {
        this.growTo(
          Math.min(this.offsets.length + additionalRows, this.listSize + 1),
        );
      }
    }

    return fenwickFindByPrefixSum(this.offsets, this.highestBit, offset);
  }

  getOffset(index: number): number {
    if (index <= this.lastMeasuredIndex) {
      return this.calculatedOffsets[index];
    }

    const offset = this.sum(index);

    this.calculatedOffsets[index] = offset;

    if (index === this.lastMeasuredIndex + 1) {
      this.lastMeasuredIndex = index;
    }

    return offset;
  }

  getSize(index: number): number {
    const treeIndex = index + 1;

    if (treeIndex >= this.sizes.length) {
      return this.estimatedSize;
    }

    return this.sizes[treeIndex];
  }

  getTotal(): number {
    return this.total.getTotal();
  }

  getVersion(): number {
    return this.version;
  }

  subscribe(callback: () => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);
  }

  private sum(index: number): number {
    this.prefill(index);

    return fenwickSum(this.offsets, index);
  }

  private prefill(index: number): void {
    if (index < this.sizes.length) {
      return;
    }

    this.growTo(index + 1);
  }

  private growTo(requiredLength: number): void {
    const oldLength = this.sizes.length;

    if (requiredLength <= oldLength) {
      return;
    }

    const maxLength = this.listSize + 1;
    const growth = Math.max(64, Math.ceil(oldLength * 0.5));

    const newLength = Math.max(
      requiredLength,
      Math.min(maxLength, oldLength + growth),
    );

    const addedCount = newLength - oldLength;

    this.sizes.length = newLength;
    this.sizes.fill(this.estimatedSize, oldLength, newLength);

    this.offsets.length = newLength;
    this.offsets.fill(0, oldLength, newLength);

    this.calculatedOffsets.length = newLength;
    this.calculatedOffsets.fill(0, oldLength, newLength);

    fenwickRebuildRange(this.offsets, this.sizes, oldLength, newLength);

    this.materializedTotal += addedCount * this.estimatedSize;

    this.updateHighestBit();
  }

  private initOffsets(): void {
    fenwickRebuildRange(this.offsets, this.sizes, 1, this.sizes.length);
  }

  private updateHighestBit(): void {
    this.highestBit = fenwickHighestBit(this.offsets.length);
  }

  private add(index: number, value: number): void {
    fenwickAdd(this.offsets, index, value);
  }

  private nextVersion(): void {
    this.version += 1;
  }

  private notify(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }

  updateListSize(nextListSize: number): void {
    if (nextListSize === this.listSize) {
      return;
    }

    if (nextListSize > this.listSize) {
      const addedCount = nextListSize - this.listSize;

      this.listSize = nextListSize;
      this.total.updateTotal(0, addedCount * this.estimatedSize);
      this.notify();
      this.nextVersion();
      return;
    }

    const oldListSize = this.listSize;
    const oldSizesLength = this.sizes.length;
    const newLength = nextListSize + 1;

    for (const treeIndex of this.pendingSizes.keys()) {
      if (treeIndex > nextListSize) {
        this.pendingSizes.delete(treeIndex);
      }
    }

    for (const treeIndex of this.processingSizes.keys()) {
      if (treeIndex > nextListSize) {
        this.processingSizes.delete(treeIndex);
      }
    }

    let removedTotal = 0;

    if (newLength < oldSizesLength) {
      for (let i = newLength; i < oldSizesLength; i++) {
        removedTotal += this.sizes[i];
      }

      this.materializedTotal -= removedTotal;

      this.sizes.length = newLength;
      this.offsets.length = newLength;
      this.calculatedOffsets.length = newLength;

      this.updateHighestBit();
    }

    const unmaterializedRemovedCount =
      oldListSize - Math.max(nextListSize, oldSizesLength - 1);

    removedTotal += unmaterializedRemovedCount * this.estimatedSize;

    this.lastMeasuredIndex = Math.min(this.lastMeasuredIndex, nextListSize - 1);

    this.listSize = nextListSize;
    this.total.updateTotal(removedTotal, 0);

    this.notify();
    this.nextVersion();
  }
}
