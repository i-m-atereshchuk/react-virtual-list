import { type Measurement } from "./Measurement";

export class MeasurementStatic implements Measurement {
  private initListSize: number;
  private initRowHeight: number;

  constructor(initListSize: number, initRowHeight: number) {
    this.initListSize = initListSize;
    this.initRowHeight = initRowHeight;
  }

  setRowHeight(index: number, nextHeight: number): boolean {
    if (index > this.initListSize) {
      this.initListSize = index + 1;
      this.initRowHeight = nextHeight;
      return true;
    }

    if (nextHeight === this.initRowHeight) {
      return false;
    }

    this.initRowHeight = nextHeight;

    return true;
  }

  getSize(): number {
    return this.initRowHeight;
  }

  getOffset(index: number): number {
    return this.initRowHeight * index;
  }

  getTotal(): number {
    return this.initListSize * this.initRowHeight;
  }

  findNearestIndex(offset: number): number {
    return Math.floor(offset / this.initRowHeight);
  }
}
