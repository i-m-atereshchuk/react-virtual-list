import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";

import {
  fenwickAdd,
  fenwickFindByPrefixSum,
  fenwickHighestBit,
  fenwickRebuildRange,
  fenwickSum,
} from "./FenwickTree";

import { TotalScrollSize } from "./TotalScrollSize";
import { ObservableBase } from "./ObservableBase";
import { SizeChunk } from "./SizeChunk";

export const SIZE_SCALE = 64;
export const SIZE_EPSILON = SIZE_SCALE / 2;
export const CHUNK_SIZE = 64;

export abstract class MeasurementChunkedBase
  extends ObservableBase
  implements CalculationNode, Measurement
{
  protected pendingSizes = new Map<number, number>();

  protected listSize: number;

  protected materializedRowCount = 0;

  protected chunks: SizeChunk[] = [];

  protected chunkOffsets: number[] = [0];

  protected total: TotalScrollSize;

  protected highestBit = 0;

  constructor(listSize: number) {
    super();

    this.listSize = listSize;

    this.total = new TotalScrollSize(0);

    this.calculate = this.calculate.bind(this);
    this.getSize = this.getSize.bind(this);
  }

  abstract calculate(): void;

  abstract setRowSize(index: number, nextSize: number): boolean;

  abstract getSize(index: number): number;

  abstract findNearestIndex(offset: number): number;

  abstract updateListSize(nextListSize: number): void;

  protected abstract prefill(requiredRows: number): void;

  getOffset(index: number): number {
    if (index <= 0) {
      return 0;
    }

    this.prefill(index);

    const chunkIndex = Math.floor(index / CHUNK_SIZE);
    const localIndex = index % CHUNK_SIZE;

    const previousChunksTotal = fenwickSum(this.chunkOffsets, chunkIndex);

    if (localIndex === 0) {
      return this.toExternal(previousChunksTotal);
    }

    const chunk = this.chunks[chunkIndex];

    let localOffset = 0;

    for (let i = 0; i < localIndex; i++) {
      localOffset += chunk.getSize(i);
    }

    return this.toExternal(previousChunksTotal + localOffset);
  }

  getTotal(): number {
    return this.toExternal(this.total.getTotal());
  }

  invalidateCache(): void {}

  protected initializeTotal(total: number): void {
    this.total = new TotalScrollSize(total);
  }

  protected appendRows(count: number, size: number): void {
    let remaining = count;

    if (remaining <= 0) {
      return;
    }

    const lastChunk = this.chunks[this.chunks.length - 1];

    if (lastChunk && lastChunk.length < CHUNK_SIZE) {
      const available = CHUNK_SIZE - lastChunk.length;

      const addCount = Math.min(available, remaining);

      const start = lastChunk.length;
      const end = start + addCount;

      for (let i = start; i < end; i++) {
        lastChunk.setSize(i, size);
      }

      this.materializedRowCount += addCount;

      remaining -= addCount;
    }

    while (remaining > 0) {
      const length = Math.min(CHUNK_SIZE, remaining);

      const chunk = new SizeChunk(size, CHUNK_SIZE);

      for (let i = 0; i < length; i++) {
        chunk.setSize(i, size);
      }

      this.chunks.push(chunk);

      this.materializedRowCount += length;

      remaining -= length;
    }
  }

  protected truncateRows(nextRowCount: number): number {
    if (nextRowCount === 0) {
      let removedTotal = 0;

      for (const chunk of this.chunks) {
        removedTotal += chunk.total;
      }

      this.chunks = [];

      this.materializedRowCount = 0;

      return removedTotal;
    }

    const fullChunkCount = Math.floor(nextRowCount / CHUNK_SIZE);

    const remainder = nextRowCount % CHUNK_SIZE;

    let removedTotal = 0;

    if (remainder === 0) {
      for (let i = fullChunkCount; i < this.chunks.length; i++) {
        removedTotal += this.chunks[i].total;
      }

      this.chunks.length = fullChunkCount;

      this.materializedRowCount = nextRowCount;

      return removedTotal;
    }

    const partialChunkIndex = fullChunkCount;

    const partialChunk = this.chunks[partialChunkIndex];

    removedTotal += partialChunk.truncate(remainder);

    for (let i = partialChunkIndex + 1; i < this.chunks.length; i++) {
      removedTotal += this.chunks[i].total;
    }

    this.chunks.length = partialChunkIndex + 1;

    this.materializedRowCount = nextRowCount;

    return removedTotal;
  }

  protected getInternalSize(index: number): number {
    const chunkIndex = Math.floor(index / CHUNK_SIZE);

    const localIndex = index % CHUNK_SIZE;

    return this.chunks[chunkIndex].getSize(localIndex);
  }

  protected commitInternalSize(
    rowIndex: number,
    nextSize: number,
  ): {
    prevSize: number;
    difference: number;
  } {
    const chunkIndex = Math.floor(rowIndex / CHUNK_SIZE);

    const localIndex = rowIndex % CHUNK_SIZE;

    const chunk = this.chunks[chunkIndex];

    const prevSize = chunk.getSize(localIndex);

    const difference = nextSize - prevSize;

    chunk.setSize(localIndex, nextSize);

    fenwickAdd(this.chunkOffsets, chunkIndex + 1, difference);

    this.total.updateTotal(prevSize, nextSize);

    return {
      prevSize,
      difference,
    };
  }

  protected findIndexByInternalOffset(
    internalOffset: number,
    fallbackLimit: number,
  ): number {
    if (this.materializedRowCount === 0) {
      return 0;
    }

    const chunkIndex = fenwickFindByPrefixSum(
      this.chunkOffsets,
      this.highestBit,
      internalOffset,
    );

    if (chunkIndex >= this.chunks.length) {
      return Math.min(this.materializedRowCount, fallbackLimit);
    }

    const chunkStartOffset = fenwickSum(this.chunkOffsets, chunkIndex);

    const offsetInsideChunk = internalOffset - chunkStartOffset;

    const chunk = this.chunks[chunkIndex];

    let localOffset = 0;

    for (let localIndex = 0; localIndex < chunk.length; localIndex++) {
      const nextOffset = localOffset + chunk.getSize(localIndex);

      if (offsetInsideChunk < nextOffset) {
        return chunkIndex * CHUNK_SIZE + localIndex;
      }

      localOffset = nextOffset;
    }

    return Math.min((chunkIndex + 1) * CHUNK_SIZE, fallbackLimit);
  }

  protected deletePendingSizesAfter(maxTreeIndex: number): void {
    for (const treeIndex of this.pendingSizes.keys()) {
      if (treeIndex > maxTreeIndex) {
        this.pendingSizes.delete(treeIndex);
      }
    }
  }

  protected rebuildChunkFenwick(): void {
    const chunkTotals = new Array(this.chunks.length + 1).fill(0);

    for (let i = 0; i < this.chunks.length; i++) {
      chunkTotals[i + 1] = this.chunks[i].total;
    }

    this.chunkOffsets = new Array(chunkTotals.length).fill(0);

    fenwickRebuildRange(this.chunkOffsets, chunkTotals, 1, chunkTotals.length);

    this.updateHighestBit();
  }

  protected updateHighestBit(): void {
    this.highestBit = fenwickHighestBit(this.chunkOffsets.length);
  }

  protected toInternal(value: number): number {
    return Math.round(value * SIZE_SCALE);
  }

  protected toExternal(value: number): number {
    return value / SIZE_SCALE;
  }
}
