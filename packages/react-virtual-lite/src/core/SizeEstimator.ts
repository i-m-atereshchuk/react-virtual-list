export class SizeEstimator {
  private totalSize = 0;
  private count = 0;

  private sizes: Float32Array;

  constructor(
    private defaultSize: number,
    initialCapacity = 16,
  ) {
    this.sizes = new Float32Array(initialCapacity);
  }

  addSize(size: number, index: number) {
    if (size === 0) {
      throw new Error("Size must be greater than 0");
    }

    this.ensureCapacity(index);

    const prevSize = this.sizes[index];

    if (prevSize === size) {
      return;
    }

    if (prevSize === 0) {
      this.count++;
    } else {
      this.totalSize -= prevSize;
    }

    this.sizes[index] = size;
    this.totalSize += size;
  }

  getEstimatedSize() {
    if (this.count === 0) {
      return this.defaultSize;
    }

    return this.totalSize / this.count;
  }

  private ensureCapacity(index: number) {
    if (index < this.sizes.length) {
      return;
    }

    let capacity = this.sizes.length || 1;

    while (capacity <= index) {
      capacity *= 2;
    }

    const sizes = new Float32Array(capacity);
    sizes.set(this.sizes);

    this.sizes = sizes;
  }
}
