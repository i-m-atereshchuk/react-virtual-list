import {
  CHUNK_SIZE,
  MeasurementChunkedBase,
  SIZE_EPSILON,
  SIZE_SCALE,
} from "./MeasurementChunkedBase";

export class MeasurementDynamicLazy extends MeasurementChunkedBase {
  private processingSizes = new Map<number, number>();

  private readonly estimatedSize: number;

  private materializedTotal = 0;

  constructor(
    listSize: number,
    viewPortSize: number,
    estimatedSize: number,
    overscan: number,
  ) {
    super(listSize);

    this.estimatedSize = this.toInternal(estimatedSize);

    const endIndex = Math.min(
      Math.floor(viewPortSize / estimatedSize) + overscan,
      listSize - 1,
    );

    const initialRowCount = endIndex + 1;

    this.appendRows(initialRowCount, this.estimatedSize);

    this.initializeTotal(listSize * this.estimatedSize);

    this.materializedTotal = initialRowCount * this.estimatedSize;

    this.rebuildChunkFenwick();
  }

  setRowSize(index: number, nextSize: number): boolean {
    if (
      index < 0 ||
      index >= this.listSize ||
      nextSize < 0 ||
      !Number.isFinite(nextSize)
    ) {
      return false;
    }

    const treeIndex = index + 1;

    const nextInternalSize = this.toInternal(nextSize);

    const committedSize =
      index < this.materializedRowCount
        ? this.getInternalSize(index)
        : this.estimatedSize;

    const currentSize = this.pendingSizes.get(treeIndex) ?? committedSize;

    if (
      Math.abs(currentSize - nextInternalSize) <= SIZE_EPSILON &&
      this.version > -1
    ) {
      return false;
    }

    if (Math.abs(committedSize - nextInternalSize) <= SIZE_EPSILON) {
      this.pendingSizes.delete(treeIndex);
    } else {
      this.pendingSizes.set(treeIndex, nextInternalSize);
    }

    this.notify();

    return true;
  }

  calculate(): void {
    if (this.pendingSizes.size === 0) {
      return;
    }

    const processingSizes = this.pendingSizes;

    this.pendingSizes = this.processingSizes;

    this.processingSizes = processingSizes;

    this.pendingSizes.clear();

    let maxTreeIndex = -1;

    for (const treeIndex of processingSizes.keys()) {
      if (treeIndex > maxTreeIndex) {
        maxTreeIndex = treeIndex;
      }
    }

    if (maxTreeIndex >= 0) {
      this.prefill(maxTreeIndex);
    }

    for (const [treeIndex, rowSize] of processingSizes) {
      const rowIndex = treeIndex - 1;

      const prevSize = this.getInternalSize(rowIndex);

      const difference = rowSize - prevSize;

      if (Math.abs(difference) <= SIZE_EPSILON) {
        continue;
      }

      const committed = this.commitInternalSize(rowIndex, rowSize);

      this.materializedTotal += committed.difference;
    }

    processingSizes.clear();

    this.nextVersion();
  }

  findNearestIndex(offset: number): number {
    const internalOffset = offset * SIZE_SCALE;

    if (
      internalOffset > this.materializedTotal &&
      this.materializedRowCount < this.listSize
    ) {
      const difference = internalOffset - this.materializedTotal;

      const additionalRows = Math.floor(difference / this.estimatedSize);

      if (additionalRows > 0) {
        this.growTo(
          Math.min(this.materializedRowCount + additionalRows, this.listSize),
        );
      }
    }

    return this.findIndexByInternalOffset(internalOffset, this.listSize);
  }

  getSize(index: number): number {
    if (index >= this.materializedRowCount) {
      return this.toExternal(this.estimatedSize);
    }

    return this.toExternal(this.getInternalSize(index));
  }

  updateListSize(nextListSize: number): void {
    if (nextListSize === this.listSize) {
      return;
    }

    if (nextListSize < 0) {
      return;
    }

    if (nextListSize > this.listSize) {
      const addedCount = nextListSize - this.listSize;

      this.listSize = nextListSize;

      this.total.updateTotal(0, addedCount * this.estimatedSize);

      this.notify();
      this.nextVersion();

      return;
    }

    const oldListSize = this.listSize;

    const oldMaterializedRowCount = this.materializedRowCount;

    this.deletePendingSizesAfter(nextListSize);

    for (const treeIndex of this.processingSizes.keys()) {
      if (treeIndex > nextListSize) {
        this.processingSizes.delete(treeIndex);
      }
    }

    let removedTotal = 0;

    if (nextListSize < oldMaterializedRowCount) {
      const removedMaterializedTotal = this.truncateRows(nextListSize);

      removedTotal += removedMaterializedTotal;

      this.materializedTotal -= removedMaterializedTotal;

      this.rebuildChunkFenwick();
    }

    const unmaterializedRemovedCount =
      oldListSize - Math.max(nextListSize, oldMaterializedRowCount);

    removedTotal += unmaterializedRemovedCount * this.estimatedSize;

    this.listSize = nextListSize;

    this.total.updateTotal(removedTotal, 0);

    this.notify();
    this.nextVersion();
  }

  protected prefill(requiredRows: number): void {
    if (requiredRows <= this.materializedRowCount) {
      return;
    }

    this.growTo(requiredRows);
  }

  private growTo(requiredRows: number): void {
    const oldLength = this.materializedRowCount + 1;

    const requiredLength = requiredRows + 1;

    if (requiredLength <= oldLength) {
      return;
    }

    const maxLength = this.listSize + 1;

    const growth = Math.max(CHUNK_SIZE, Math.ceil(oldLength * 0.5));

    const newLength = Math.max(
      requiredLength,
      Math.min(maxLength, oldLength + growth),
    );

    const newRowCount = newLength - 1;

    const addedCount = newRowCount - this.materializedRowCount;

    if (addedCount <= 0) {
      return;
    }

    this.appendRows(addedCount, this.estimatedSize);

    this.materializedTotal += addedCount * this.estimatedSize;

    this.rebuildChunkFenwick();
  }
}
