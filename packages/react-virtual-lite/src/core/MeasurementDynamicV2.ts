import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";
import { SizeEstimator } from "./SizeEstimator";
import { TotalScrollSize } from "./TotalScrollSize";

export class MeasurementDynamicV2 implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();
  private pendingSizes = new Map<number, number>();

  private offsets: Float64Array;
  private sizes: Float32Array;
  private calculatedOffsets: Float64Array;

  private total: TotalScrollSize;
  private sizeEstimator: SizeEstimator;

  private lastMeasuredIndex = -1;
  private version = -1;

  // Логічний розмір, а не capacity масивів.
  private listSize: number;

  constructor(listSize: number, sizeEstimator: SizeEstimator) {
    this.listSize = listSize + 1;
    this.sizeEstimator = sizeEstimator;

    const estimatedSize = this.sizeEstimator.getEstimatedSize();

    this.sizes = new Float32Array(this.listSize).fill(estimatedSize);
    this.sizes[0] = 0;

    this.offsets = new Float64Array(this.listSize);
    this.calculatedOffsets = new Float64Array(this.listSize);

    this.total = new TotalScrollSize(listSize * estimatedSize);

    this.calculate = this.calculate.bind(this);

    this.initOffsets();
  }

  setRowSize(index: number, nextSize: number): boolean {
    const nextIndex = index + 1;

    this.resize(nextIndex);

    const currentSize = this.sizes[nextIndex];

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

    while (bit << 1 < this.listSize) {
      bit <<= 1;
    }

    while (bit !== 0) {
      const next = index + bit;

      if (next < this.listSize && sum + this.offsets[next] <= offset) {
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
      this.resize(rowIndex);

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
    const nextIndex = index + 1;

    this.resize(nextIndex);

    return this.sizes[nextIndex];
  }

  getOffset(index: number) {
    this.resize(index);

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

  private resize(index: number) {
    if (index < this.listSize) {
      return;
    }

    const previousListSize = this.listSize;
    const estimatedSize = this.sizeEstimator.getEstimatedSize();

    // +1 потрібен тому, що index inclusive.
    const requiredSize = index + 1;

    let nextCapacity = Math.max(1, this.sizes.length);

    while (nextCapacity < requiredSize) {
      nextCapacity *= 2;
    }

    const nextSizes = new Float32Array(nextCapacity);
    nextSizes.set(this.sizes);

    const nextOffsets = new Float64Array(nextCapacity);
    nextOffsets.set(this.offsets);

    const nextCalculatedOffsets = new Float64Array(nextCapacity);
    nextCalculatedOffsets.set(this.calculatedOffsets);

    this.sizes = nextSizes;
    this.offsets = nextOffsets;
    this.calculatedOffsets = nextCalculatedOffsets;

    // Заповнюємо нові логічні елементи estimated size.
    for (let i = previousListSize; i < requiredSize; i++) {
      this.sizes[i] = estimatedSize;
      this.total.updateTotal(0, estimatedSize);

      // Додаємо новий size у Fenwick tree.
      this.add(i, estimatedSize);
    }

    this.listSize = requiredSize;
  }

  private sum(index: number) {
    this.resize(index);

    let sum = 0;

    while (index > 0) {
      sum += this.offsets[index];
      index -= index & -index;
    }

    return sum;
  }

  private initOffsets() {
    for (let i = 1; i < this.listSize; i++) {
      this.offsets[i] += this.sizes[i];

      const parent = i + (i & -i);

      if (parent < this.listSize) {
        this.offsets[parent] += this.offsets[i];
      }
    }
  }

  private add(index: number, value: number) {
    while (index < this.listSize) {
      this.offsets[index] += value;
      index += index & -index;
    }
  }
}
