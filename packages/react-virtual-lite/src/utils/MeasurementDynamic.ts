// moved to core
import { type Measurement } from "../types/Measurement";

import { SizeEstimator } from "../utils/SizeEstimator";

class TotalScrollSize {
  private total: number;

  constructor(total: number) {
    this.total = total;
  }

  getTotal() {
    return this.total;
  }

  updateTotal(prevRowSize: number, nexRowSize: number) {
    this.total -= prevRowSize;
    this.total += nexRowSize;
  }
}

export class MeasurementDynamic implements Measurement {
  private offsets: number[];
  private sizes: number[];
  private total: TotalScrollSize;
  private sizeEstimator: SizeEstimator;

  getVersion(): number {
    return 0;
  }

  constructor(initListSize: number, sizeEstimator: SizeEstimator) {
    this.sizeEstimator = sizeEstimator;
    this.sizes = new Array(initListSize + 1).fill(
      this.sizeEstimator.getEstimatedSize(),
    );
    this.sizes[0] = 0;

    this.offsets = new Array(initListSize + 1).fill(0);
    this.total = new TotalScrollSize(
      initListSize * sizeEstimator.getEstimatedSize(),
    );
    this.initOffsets();
  }

  setRowSize(index: number, nextSize: number) {
    const nextIndex = index + 1;

    this.prefill(nextIndex);

    const prevSize = this.sizes[nextIndex];

    if (Math.abs(prevSize - nextSize) < 1) {
      return false;
    }

    this.sizes[nextIndex] = nextSize;

    const difference = nextSize - prevSize;

    this.add(nextIndex, difference);
    this.total.updateTotal(prevSize, nextSize);

    return true;
  }

  getSize(index: number) {
    return this.sizes[index + 1];
  }

  getOffset(index: number) {
    return this.sum(index);
  }

  getTotal() {
    return this.total.getTotal();
  }

  private pushBack() {
    const index = this.sizes.length;
    const size = this.sizeEstimator.getEstimatedSize();

    this.sizes.push(size);
    this.offsets.push(0);

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
