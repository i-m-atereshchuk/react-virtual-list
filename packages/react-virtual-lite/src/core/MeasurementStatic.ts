import type { Publisher } from "../types/Publisher";
import { type Measurement } from "../types/Measurement";

export class MeasurementStatic implements Measurement, Publisher {
  private listSize: number;
  private rowSize: number;
  private version = 0;

  constructor(listSize: number, rowSize: number) {
    this.listSize = listSize;
    this.rowSize = rowSize;
  }

  setRowSize(index: number, nextSize: number): boolean {
    if (index > this.listSize) {
      this.listSize = index + 1;
      this.rowSize = nextSize;
      return true;
    }

    if (nextSize === this.listSize) {
      return false;
    }

    this.rowSize = nextSize;

    return true;
  }

  getSize(): number {
    return this.listSize;
  }

  getOffset(index: number): number {
    return this.rowSize * index;
  }

  getTotal(): number {
    return this.listSize * this.rowSize;
  }

  findNearestIndex(offset: number): number {
    return Math.floor(offset / this.rowSize);
  }

  calculate(): void {}

  subscribe(): void {}

  unsubscribe(): void {}

  getVersion() {
    return this.version;
  }
}
