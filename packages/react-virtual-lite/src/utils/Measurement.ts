export class Measurement {
  private offsets: number[];
  private sizes: number[];

  constructor(initListSize: number, initRowHeight: number = 50) {
    this.sizes = new Array(initListSize + 1).fill(initRowHeight);
    this.sizes[0] = 0;

    this.offsets = new Array(initListSize + 1).fill(0);
    this.initOffsets();
  }

  setRowHeight(index: number, nextHeight: number) {
    const nextIndex = index + 1;

    while (this.sizes.length < nextIndex) {
      this.pushBack();
    }

    const prevHeight = this.sizes[nextIndex];

    if (prevHeight === nextHeight) {
      return false;
    }

    this.sizes[nextIndex] = nextHeight;

    const diff = nextHeight - prevHeight;

    this.add(nextIndex, diff);

    return true;
  }

  getSize(index: number) {
    return this.sizes[index + 1];
  }

  getOffset(index: number) {
    return this.sum(index);
  }

  getTotal() {
    return this.sum(this.offsets.length - 1);
  }

  private pushBack() {
    const index = this.sizes.length;

    this.sizes.push(0);
    this.offsets.push(0);

    const lowbit = index & -index;
    const left = index - lowbit + 1;

    this.offsets[index] = this.sum(index - 1) + this.sum(left - 1);
  }

  findNearestIndex(offset: number) {
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
      this.add(i, this.sizes[i]);
    }
  }

  private add(index: number, value: number) {
    while (index < this.offsets.length) {
      this.offsets[index] += value;
      index = index + (index & -index);
    }
  }
}
