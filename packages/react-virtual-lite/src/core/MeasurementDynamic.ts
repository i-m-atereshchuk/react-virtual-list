import type { Publisher } from "../types/Publisher";
import type { Measurement } from "../types/Measurement";
import { SizeEstimator } from "./SizeEstimator";
import { TotalScrollSize } from "./TotalScrollSize";

export class MeasurementDynamic implements Publisher, Measurement {
  private listeners = new Set<() => void>();
  private pendingSizes = new Map<number, number>();

  private offsets: number[];
  private sizes: number[];
  private calculatedOffsets: number[];
  private total: TotalScrollSize;
  private sizeEstimator: SizeEstimator;
  private lastMeasuredIndex = -1;
  private version = -1;

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
  }

  setRowSize(index: number, nextSize: number): boolean {
    const nextIndex = index + 1;

    let currentSize = this.sizes[nextIndex];

    if (nextIndex < this.sizes.length) {
      currentSize = this.sizes[nextIndex];
    }

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

    let bit = 1;

    while (bit << 1 < this.offsets.length) {
      bit <<= 1;
    }

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
    this.listeners.forEach((callback) => callback());
  }

  private pushBack() {
    const index = this.sizes.length;
    const size = this.sizeEstimator.getEstimatedSize();

    this.sizes.push(size);
    this.offsets.push(0);
    this.calculatedOffsets.push(0);

    const lowbit = index & -index;
    const left = index - lowbit + 1;
    this.total.updateTotal(0, size);

    this.offsets[index] = this.sum(index - 1) - this.sum(left - 1) + size;
  }

  private prefill(index: number) {
    while (this.sizes.length <= index) {
      this.pushBack();
    }
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

  private add(index: number, value: number) {
    while (index < this.offsets.length) {
      this.offsets[index] += value;
      index = index + (index & -index);
    }
  }
}
