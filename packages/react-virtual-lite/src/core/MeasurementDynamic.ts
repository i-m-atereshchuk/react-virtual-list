import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";
import {
  fenwickAdd,
  fenwickFindByPrefixSum,
  fenwickHighestBit,
  fenwickRebuildRange,
  fenwickSum,
} from "./FenwickTree";
import { SizeEstimator } from "./SizeEstimator";
import { TotalScrollSize } from "./TotalScrollSize";

export class MeasurementDynamic implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();
  private pendingSizes = new Map<number, number>();
  private listSize: number;
  private offsets: number[];
  private sizes: number[];
  private calculatedOffsets: number[];
  private total: TotalScrollSize;
  private sizeEstimator: SizeEstimator;
  private lastMeasuredIndex = -1;
  private version = -1;
  private highestBit = 0;

  constructor(listSize: number, sizeEstimator: SizeEstimator) {
    this.listSize = listSize;
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
    return fenwickFindByPrefixSum(this.offsets, this.highestBit, offset);
  }

  updateListSize(nextListSize: number): void {
    if (nextListSize === this.listSize) {
      return;
    }

    if (nextListSize > this.listSize) {
      this.listSize = nextListSize;
      this.growTo(nextListSize + 1);

      this.notify();
      this.nextVersion();
      return;
    }

    const oldSizesLength = this.sizes.length;
    const newLength = nextListSize + 1;

    for (const treeIndex of this.pendingSizes.keys()) {
      if (treeIndex > nextListSize) {
        this.pendingSizes.delete(treeIndex);
      }
    }

    if (newLength < oldSizesLength) {
      let removedTotal = 0;

      for (let i = newLength; i < oldSizesLength; i++) {
        removedTotal += this.sizes[i];
      }

      this.sizes.length = newLength;
      this.offsets.length = newLength;
      this.calculatedOffsets.length = newLength;

      this.updateHighestBit();

      this.total.updateTotal(removedTotal, 0);
    }

    this.lastMeasuredIndex = Math.min(this.lastMeasuredIndex, nextListSize - 1);

    this.listSize = nextListSize;

    this.notify();
    this.nextVersion();
  }

  calculate(): void {
    if (this.pendingSizes.size === 0) {
      return;
    }

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

    fenwickRebuildRange(this.offsets, this.sizes, oldLength, newLength);

    this.total.updateTotal(0, addedCount * estimatedSize);
    this.updateHighestBit();
  }

  private sum(index: number) {
    this.prefill(index);

    return fenwickSum(this.offsets, index);
  }

  private initOffsets() {
    fenwickRebuildRange(this.offsets, this.sizes, 1, this.sizes.length);
  }

  private updateHighestBit() {
    this.highestBit = fenwickHighestBit(this.offsets.length);
  }

  private add(index: number, value: number) {
    fenwickAdd(this.offsets, index, value);
  }
}
