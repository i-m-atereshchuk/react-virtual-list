export interface Measurement {
  setRowHeight(index: number, nextHeight: number): boolean;
  getSize(index: number): number;
  getOffset(index: number): number;
  getTotal(): number;
  findNearestIndex(offset: number): number;
}
