import { type Measurement } from "../types/Measurement";

export class MeasurementStatic implements Measurement {
  private initListSize: number;
  private initRowSize: number;

  constructor(initListSize: number, initRowSize: number) {
    this.initListSize = initListSize;
    this.initRowSize = initRowSize;
  }

  setRowSize(index: number, nextSize: number): boolean {
    if (index > this.initListSize) {
      this.initListSize = index + 1;
      this.initRowSize = nextSize;
      return true;
    }

    if (nextSize === this.initRowSize) {
      return false;
    }

    this.initRowSize = nextSize;

    return true;
  }

  getSize(): number {
    return this.initRowSize;
  }

  getOffset(index: number): number {
    return this.initRowSize * index;
  }

  getTotal(): number {
    return this.initListSize * this.initRowSize;
  }

  findNearestIndex(offset: number): number {
    return Math.floor(offset / this.initRowSize);
  }
}
