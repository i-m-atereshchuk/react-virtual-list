import { type Measurement } from "./Measurement";

import { SizeEstimator } from "../utils/SizeEstimator";

export class MeasurementDynamic implements Measurement {
  private offsets: number[];
  private sizes: number[];
  private total = 0;
  private sizeEstimator: SizeEstimator;

  constructor(
    initListSize: number,
    initRowHeight: number = 50,
    sizeEstimator: SizeEstimator,
  ) {
    this.sizeEstimator = sizeEstimator;
    this.sizes = new Array(initListSize + 1).fill(
      this.sizeEstimator.getEstimatedSize(),
    );
    this.sizes[0] = 0;

    this.offsets = new Array(initListSize + 1).fill(0);
    this.total = initListSize * initRowHeight;
    this.initOffsets();
  }

  setRowSize(index: number, nextSize: number) {
    const nextIndex = index + 1;

    while (this.sizes.length <= nextIndex) {
      this.pushBack();
    }

    const prevSize = this.sizes[nextIndex];

    if (prevSize === nextSize) {
      return false;
    }

    this.sizes[nextIndex] = nextSize;

    const difference = nextSize - prevSize;

    this.add(nextIndex, difference);
    this.total += difference;

    return true;
  }

  getSize(index: number) {
    return this.sizes[index + 1];
  }

  getOffset(index: number) {
    return this.sum(index);
  }

  getTotal() {
    return this.total;
  }

  private pushBack() {
    const index = this.sizes.length;
    const size = this.sizeEstimator.getEstimatedSize();

    this.sizes.push(size);
    this.offsets.push(0);

    const lowbit = index & -index;
    const left = index - lowbit + 1;

    this.offsets[index] = this.sum(index - 1) - this.sum(left - 1) + size;
  }

  findNearestIndexV1(offset: number) {
    let good = -1;
    let bad = this.offsets.length;

    while (bad - good > 1) {
      const m = (good + bad) >> 1;

      if (this.sum(m) <= offset) {
        good = m;
      } else {
        bad = m;
      }
    }

    return good;
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
