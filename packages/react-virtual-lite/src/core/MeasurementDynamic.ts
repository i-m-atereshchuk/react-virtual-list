import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";
import { SizeEstimator } from "./SizeEstimator";
import { TotalScrollSize } from "./TotalScrollSize";

export class MeasurementDynamic implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();
  private pendingSizes = new Map<number, number>();

  private offsets: number[];
  private sizes: number[];
  private calculatedOffsets: number[];
  private total: TotalScrollSize;
  private sizeEstimator: SizeEstimator;
  private lastMeasuredIndex = -1;
  private version = -1;
  private highestBit = 0;

  constructor(listSize: number, sizeEstimator: SizeEstimator) {
    this.sizeEstimator = sizeEstimator;
    this.sizes = new Array(listSize + 1).fill(
      this.sizeEstimator.getEstimatedSize(),
    );
    this.sizes[0] = 0;
    this.offsets = new Array(listSize + 1).fill(0);
    this.calculatedOffsets = new Array(listSize + 1).fill(0);
    this.total = new TotalScrollSize(
      listSize * sizeEstimator.getEstimatedSize(),
    );

    this.calculate = this.calculate.bind(this);
    this.initOffsets();
    this.updateHighestBit();
  }

  setRowSize(index: number, nextSize: number): boolean {
    const nextIndex = index + 1;

    const currentSize =
      nextIndex < this.sizes.length ? this.sizes[nextIndex] : 0;

    if (Math.abs(currentSize - nextSize) > 0.5) {
      this.pendingSizes.set(nextIndex, nextSize);
      this.notify();
      return true;
    }

    return false;
  }

  findNearestIndex(offset: number) {
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

  calculate(): void {
    const processingSizes = this.pendingSizes;

    this.pendingSizes = new Map();

    for (const [rowIndex, rowSize] of processingSizes) {
      this.prefill(rowIndex);
      const prevSize = this.sizes[rowIndex];
      const difference = rowSize - prevSize;
      this.sizes[rowIndex] = rowSize;

      this.add(rowIndex, difference);
      this.total.updateTotal(prevSize, rowSize);
      this.sizeEstimator.addSize(rowSize, rowIndex);
      this.lastMeasuredIndex = Math.min(this.lastMeasuredIndex, rowIndex - 1);
    }

    this.nextVersion();
  }

  getVersion() {
    return this.version;
  }

  getSize(index: number) {
    return this.sizes[index + 1];
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

  getTotal() {
    return this.total.getTotal();
  }

  subscribe(callback: () => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);
  }

  invalidateCache() {
    this.lastMeasuredIndex = -1;
  }

  private nextVersion() {
    this.version += 1;
  }

  private notify(): void {
    for (const callback of this.listeners) {
      callback();
    }
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

    const estimatedSize = this.sizeEstimator.getEstimatedSize();
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

    this.total.updateTotal(0, addedCount * estimatedSize);
    this.updateHighestBit();
  }

  private sum(index: number) {
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

  private add(index: number, value: number) {
    while (index < this.offsets.length) {
      this.offsets[index] += value;
      index = index + (index & -index);
    }
  }
}
