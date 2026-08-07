export interface Measurement {
  setRowSize(index: number, nextSize: number): boolean;
  getSize(index: number): number;
  getOffset(index: number): number;
  getTotal(): number;
  findNearestIndex(offset: number): number;
}
