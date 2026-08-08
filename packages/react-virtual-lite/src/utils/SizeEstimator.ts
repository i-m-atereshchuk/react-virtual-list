export class SizeEstimator {
  private totalSize = 0;
  private count = 0;
  private sizeMap = new Map<number, number>();
  private size: number;

  constructor(size: number) {
    this.size = size;
  }

  addSize(size: number, index: number) {
    let prevSize = this.sizeMap.get(index);
    let count = 0;

    if (prevSize === undefined) {
      prevSize = 0;
      count = 1;
    }

    this.totalSize -= prevSize;
    this.totalSize += size;
    this.sizeMap.set(index, size);
    this.count += count;
  }

  getEstimatedSize() {
    if (this.count === 0) {
      return this.size;
    }

    return this.totalSize / this.count;
  }
}
