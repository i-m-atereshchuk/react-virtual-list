import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";

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

  private readonly listSize: number;

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

    let index = 0;
    let sum = 0;
    let bit = this.highestBit;

    while (bit !== 0) {
      const next = index + bit;

      if (next < this.offsets.length && sum + this.offsets[next] <= offset) {
        sum += this.offsets[next];
        index = next;
      }

      bit >>= 1;
    }

    return index;
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

    let sum = 0;

    while (index > 0) {
      sum += this.offsets[index];

      index -= index & -index;
    }

    return sum;
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

    let index = oldLength - 1;

    while (index > 0) {
      const lowbit = index & -index;
      const parent = index + lowbit;

      if (parent < newLength) {
        this.offsets[parent] += this.offsets[index];
      }

      index -= lowbit;
    }

    for (let i = oldLength; i < newLength; i++) {
      this.offsets[i] += this.sizes[i];

      const parent = i + (i & -i);

      if (parent < newLength) {
        this.offsets[parent] += this.offsets[i];
      }
    }

    const previousLogicalLength = Math.max(oldLength, maxLength);
    const addedLogicalCount = Math.max(0, newLength - previousLogicalLength);

    if (addedLogicalCount > 0) {
      const difference = addedLogicalCount * this.estimatedSize;

      this.total.updateTotal(0, difference);
    }

    this.materializedTotal += addedCount * this.estimatedSize;

    this.updateHighestBit();
  }

  private initOffsets(): void {
    for (let i = 1; i < this.sizes.length; i++) {
      this.offsets[i] += this.sizes[i];

      const parent = i + (i & -i);

      if (parent < this.offsets.length) {
        this.offsets[parent] += this.offsets[i];
      }
    }
  }

  private updateHighestBit(): void {
    let bit = 1;

    while (bit * 2 < this.offsets.length) {
      bit *= 2;
    }

    this.highestBit = bit;
  }

  private add(index: number, value: number): void {
    while (index < this.offsets.length) {
      this.offsets[index] += value;

      index += index & -index;
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
