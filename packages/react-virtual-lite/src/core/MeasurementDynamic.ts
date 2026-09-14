import { SizeEstimator } from "./SizeEstimator";

import {
  MeasurementChunkedBase,
  SIZE_EPSILON,
  SIZE_SCALE,
} from "./MeasurementChunkedBase";

export class MeasurementDynamic extends MeasurementChunkedBase {
  private sizeEstimator: SizeEstimator;

  constructor(listSize: number, sizeEstimator: SizeEstimator) {
    super(listSize);

    this.sizeEstimator = sizeEstimator;

    const estimatedSize = this.toInternal(sizeEstimator.getEstimatedSize());

    this.appendRows(listSize, estimatedSize);

    this.initializeTotal(listSize * estimatedSize);

    this.rebuildChunkFenwick();
  }

  setRowSize(index: number, nextSize: number): boolean {
    if (index < 0 || nextSize < 0 || !Number.isFinite(nextSize)) {
      return false;
    }

    const treeIndex = index + 1;

    const nextInternalSize = this.toInternal(nextSize);

    const currentSize =
      treeIndex <= this.materializedRowCount ? this.getInternalSize(index) : 0;

    if (Math.abs(currentSize - nextInternalSize) <= SIZE_EPSILON) {
      return false;
    }

    this.pendingSizes.set(treeIndex, nextInternalSize);

    this.notify();

    return true;
  }

  calculate(): void {
    if (this.pendingSizes.size === 0) {
      return;
    }

    const processingSizes = this.pendingSizes;

    this.pendingSizes = new Map<number, number>();

    for (const [treeIndex, nextSize] of processingSizes) {
      this.prefill(treeIndex);

      const rowIndex = treeIndex - 1;

      const { prevSize } = this.commitInternalSize(rowIndex, nextSize);

      this.sizeEstimator.addSize(this.toExternal(nextSize), treeIndex);

      void prevSize;
    }

    this.nextVersion();
  }

  getSize(index: number): number {
    return this.toExternal(this.getInternalSize(index));
  }

  findNearestIndex(offset: number): number {
    const internalOffset = offset * SIZE_SCALE;

    return this.findIndexByInternalOffset(
      internalOffset,
      this.materializedRowCount,
    );
  }

  updateListSize(nextListSize: number): void {
    if (nextListSize === this.listSize) {
      return;
    }

    if (nextListSize < 0) {
      return;
    }

    if (nextListSize > this.listSize) {
      this.listSize = nextListSize;

      this.prefill(nextListSize);

      this.notify();
      this.nextVersion();

      return;
    }

    this.deletePendingSizesAfter(nextListSize);

    if (nextListSize < this.materializedRowCount) {
      const removedTotal = this.truncateRows(nextListSize);

      this.total.updateTotal(removedTotal, 0);

      this.rebuildChunkFenwick();
    }

    this.listSize = nextListSize;

    this.notify();
    this.nextVersion();
  }

  protected prefill(requiredRows: number): void {
    if (this.materializedRowCount >= requiredRows) {
      return;
    }

    const estimatedSize = this.toInternal(
      this.sizeEstimator.getEstimatedSize(),
    );

    const addedCount = requiredRows - this.materializedRowCount;

    this.appendRows(addedCount, estimatedSize);

    this.total.updateTotal(0, addedCount * estimatedSize);

    this.rebuildChunkFenwick();
  }
}
