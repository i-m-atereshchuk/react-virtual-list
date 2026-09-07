import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";
import { TotalScrollSize } from "./TotalScrollSize";

export class MeasurementDynamicLazy implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();
  private pendingSizes = new Map<number, number>();
  private maxPendingSizeIndex = -1;

  private offsets: number[];
  private sizes: number[];
  private calculatedOffsets: number[];
  private total: TotalScrollSize;
  private estimatedSize: number;
  private lastMeasuredIndex = -1;
  private version = -1;
  private highestBit = 0;
  private listSize: number;

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

    const initListSize = endIndex + 2;

    this.sizes = new Array(initListSize).fill(estimatedSize);
    this.sizes[0] = 0;
    this.offsets = new Array(initListSize).fill(0);
    this.calculatedOffsets = new Array(initListSize).fill(0);
    this.total = new TotalScrollSize(listSize * this.estimatedSize);

    this.initOffsets();
    this.updateHighestBit();
  }

  setRowSize(index: number, nextSize: number): boolean {
    const nextIndex = index + 1;
    this.maxPendingSizeIndex = Math.max(this.maxPendingSizeIndex, nextIndex);

    const currentSize =
      nextIndex < this.sizes.length ? this.sizes[nextIndex] : 0;

    if (Math.abs(currentSize - nextSize) > 0.5) {
      this.pendingSizes.set(nextIndex, nextSize);
      this.notify();
      return true;
    }

    return false;
  }

  calculate(): void {
    const processingSizes = this.pendingSizes;
    const maxPendingSizeIndex = this.maxPendingSizeIndex;

    this.maxPendingSizeIndex = -1;
    this.pendingSizes = new Map();

    this.prefill(maxPendingSizeIndex);

    for (const [rowIndex, rowSize] of processingSizes) {
      const prevSize = this.sizes[rowIndex];
      const difference = rowSize - prevSize;
      this.sizes[rowIndex] = rowSize;

      this.add(rowIndex, difference);
      this.total.updateTotal(prevSize, rowSize);
      this.lastMeasuredIndex = Math.min(this.lastMeasuredIndex, rowIndex - 1);
    }

    this.nextVersion();
  }

  findNearestIndex(offset: number) {
    const lastCalculated = this.getOffset(this.offsets.length - 1);
    const diff = offset - lastCalculated;

    if (diff > 0 && Math.floor(diff / this.estimatedSize) > 0) {
      this.growTo(
        Math.min(
          this.offsets.length + Math.floor(diff / this.estimatedSize),
          this.listSize + 1,
        ),
      );
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

  getOffset(index: number) {
    if (index > this.lastMeasuredIndex) {
      this.calculatedOffsets[index] = this.sum(index);
    }

    if (index - this.lastMeasuredIndex === 1) {
      this.lastMeasuredIndex = index;
    }

    return this.calculatedOffsets[index];
  }

  getVersion() {
    return this.version;
  }

  getSize(index: number) {
    if (index + 1 > this.sizes.length - 1) {
      return this.estimatedSize;
    }

    return this.sizes[index + 1];
  }

  getTotal() {
    return this.total.getTotal();
  }

  subscribe(callback: () => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);
  }

  private sum(index: number) {
    this.growTo(index + 1);
    let sum = 0;

    this.prefill(index);

    while (index > 0) {
      sum += this.offsets[index];
      index = index - (index & -index);
    }

    return sum;
  }

  private initOffsets() {
    for (let i = 1; i < this.sizes.length; i++) {
      this.offsets[i] += this.sizes[i];

      const parent = i + (i & -i);

      if (parent < this.offsets.length) {
        this.offsets[parent] += this.offsets[i];
      }
    }
  }

  private updateHighestBit() {
    let bit = 1;

    while (bit << 1 < this.offsets.length) {
      bit <<= 1;
    }

    this.highestBit = bit;
  }

  private prefill(index: number) {
    if (this.sizes.length > index) {
      return;
    }

    this.growTo(index + 1);
  }

  private growTo(newLength: number) {
    const oldLength = this.sizes.length;

    if (newLength <= oldLength) {
      return;
    }

    const estimatedSize = this.estimatedSize;
    const addedCount = newLength - oldLength;

    this.sizes = this.sizes.concat(new Array(addedCount).fill(estimatedSize));
    this.offsets = this.offsets.concat(new Array(addedCount).fill(0));
    this.calculatedOffsets = this.calculatedOffsets.concat(
      new Array(addedCount).fill(0),
    );

    let idx = oldLength - 1;

    while (idx > 0) {
      const lowbit = idx & -idx;
      const parent = idx + lowbit;

      if (parent < newLength) {
        this.offsets[parent] += this.offsets[idx];
      }

      idx -= lowbit;
    }

    for (let i = oldLength; i < newLength; i++) {
      this.offsets[i] += this.sizes[i];

      const parent = i + (i & -i);

      if (parent < newLength) {
        this.offsets[parent] += this.offsets[i];
      }
    }

    // this.total.updateTotal(0, addedCount * estimatedSize);
    this.updateHighestBit();
  }

  private add(index: number, value: number) {
    while (index < this.offsets.length) {
      this.offsets[index] += value;
      index = index + (index & -index);
    }
  }

  private nextVersion() {
    this.version += 1;
  }

  private notify(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }
}
