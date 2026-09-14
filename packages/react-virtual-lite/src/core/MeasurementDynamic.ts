import type { CalculationNode } from "../types/CalculationNode";
import type { Measurement } from "../types/Measurement";

import {
  fenwickAdd,
  fenwickFindByPrefixSum,
  fenwickHighestBit,
  fenwickRebuildRange,
  fenwickSum,
} from "./FenwickTree";

import { SizeEstimator } from "./SizeEstimator";
import { TotalScrollSize } from "./TotalScrollSize";

const SIZE_SCALE = 64;
const SIZE_EPSILON = SIZE_SCALE / 2;

const CHUNK_SIZE = 64;

interface SizeChunk {
  sizes: Int32Array;
  length: number;
  total: number;
}

export class MeasurementDynamic implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();

  private pendingSizes = new Map<number, number>();

  private listSize: number;

  private materializedRowCount = 0;

  private chunks: SizeChunk[] = [];

  private chunkOffsets: number[] = [0];

  private total: TotalScrollSize;

  private sizeEstimator: SizeEstimator;

  private version = -1;

  private highestBit = 0;

  constructor(listSize: number, sizeEstimator: SizeEstimator) {
    this.listSize = listSize;
    this.sizeEstimator = sizeEstimator;

    const estimatedSize = this.toInternal(sizeEstimator.getEstimatedSize());

    this.appendRows(listSize, estimatedSize);

    this.total = new TotalScrollSize(listSize * estimatedSize);

    this.calculate = this.calculate.bind(this);

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
      /*
       * Materialize all rows through this one.
       */
      this.prefill(treeIndex);

      const rowIndex = treeIndex - 1;

      const chunkIndex = Math.floor(rowIndex / CHUNK_SIZE);

      const localIndex = rowIndex % CHUNK_SIZE;

      const chunk = this.chunks[chunkIndex];

      const prevSize = chunk.sizes[localIndex];

      const difference = nextSize - prevSize;

      chunk.sizes[localIndex] = nextSize;

      chunk.total += difference;

      fenwickAdd(this.chunkOffsets, chunkIndex + 1, difference);

      this.total.updateTotal(prevSize, nextSize);

      this.sizeEstimator.addSize(this.toExternal(nextSize), treeIndex);
    }

    this.nextVersion();
  }

  getSize(index: number): number {
    return this.toExternal(this.getInternalSize(index));
  }

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
      localOffset += chunk.sizes[i];
    }

    return this.toExternal(previousChunksTotal + localOffset);
  }

  findNearestIndex(offset: number): number {
    if (this.materializedRowCount === 0) {
      return 0;
    }

    const internalOffset = offset * SIZE_SCALE;

    const chunkIndex = fenwickFindByPrefixSum(
      this.chunkOffsets,
      this.highestBit,
      internalOffset,
    );

    if (chunkIndex >= this.chunks.length) {
      return this.materializedRowCount;
    }

    const chunkStartOffset = fenwickSum(this.chunkOffsets, chunkIndex);

    const offsetInsideChunk = internalOffset - chunkStartOffset;

    const chunk = this.chunks[chunkIndex];

    let localOffset = 0;

    /*
     * IMPORTANT:
     *
     * Iterate only over materialized values,
     * not over all 64 cells.
     */
    for (let localIndex = 0; localIndex < chunk.length; localIndex++) {
      const nextOffset = localOffset + chunk.sizes[localIndex];

      if (offsetInsideChunk < nextOffset) {
        return chunkIndex * CHUNK_SIZE + localIndex;
      }

      localOffset = nextOffset;
    }

    return Math.min((chunkIndex + 1) * CHUNK_SIZE, this.materializedRowCount);
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

    for (const treeIndex of this.pendingSizes.keys()) {
      if (treeIndex > nextListSize) {
        this.pendingSizes.delete(treeIndex);
      }
    }

    if (nextListSize < this.materializedRowCount) {
      const removedTotal = this.truncateRows(nextListSize);

      this.total.updateTotal(removedTotal, 0);

      this.rebuildChunkFenwick();
    }

    this.listSize = nextListSize;

    this.notify();
    this.nextVersion();
  }

  getTotal(): number {
    return this.toExternal(this.total.getTotal());
  }

  getVersion(): number {
    return this.version;
  }

  subscribe(callback: () => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);
  }

  private prefill(requiredRows: number): void {
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

  private appendRows(count: number, size: number): void {
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

      lastChunk.sizes.fill(size, start, end);

      lastChunk.length = end;

      lastChunk.total += addCount * size;

      this.materializedRowCount += addCount;

      remaining -= addCount;
    }

    while (remaining > 0) {
      const length = Math.min(CHUNK_SIZE, remaining);

      const sizes = new Int32Array(CHUNK_SIZE);

      sizes.fill(size, 0, length);

      this.chunks.push({
        sizes,
        length,
        total: length * size,
      });

      this.materializedRowCount += length;

      remaining -= length;
    }
  }

  private truncateRows(nextRowCount: number): number {
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

    let removedFromPartial = 0;

    for (let i = remainder; i < partialChunk.length; i++) {
      removedFromPartial += partialChunk.sizes[i];
    }

    partialChunk.sizes.fill(0, remainder, partialChunk.length);

    partialChunk.length = remainder;

    partialChunk.total -= removedFromPartial;

    removedTotal += removedFromPartial;

    for (let i = partialChunkIndex + 1; i < this.chunks.length; i++) {
      removedTotal += this.chunks[i].total;
    }

    this.chunks.length = partialChunkIndex + 1;

    this.materializedRowCount = nextRowCount;

    return removedTotal;
  }

  private getInternalSize(index: number): number {
    const chunkIndex = Math.floor(index / CHUNK_SIZE);

    const localIndex = index % CHUNK_SIZE;

    return this.chunks[chunkIndex].sizes[localIndex];
  }

  private rebuildChunkFenwick(): void {
    const chunkTotals = new Array(this.chunks.length + 1).fill(0);

    for (let i = 0; i < this.chunks.length; i++) {
      chunkTotals[i + 1] = this.chunks[i].total;
    }

    this.chunkOffsets = new Array(chunkTotals.length).fill(0);

    fenwickRebuildRange(this.chunkOffsets, chunkTotals, 1, chunkTotals.length);

    this.updateHighestBit();
  }

  invalidateCache() {}

  private updateHighestBit(): void {
    this.highestBit = fenwickHighestBit(this.chunkOffsets.length);
  }

  private nextVersion(): void {
    this.version += 1;
  }

  private notify(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }

  private toInternal(value: number): number {
    return Math.round(value * SIZE_SCALE);
  }

  private toExternal(value: number): number {
    return value / SIZE_SCALE;
  }
}
