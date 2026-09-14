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

const SIZE_SCALE = 64;
const SIZE_EPSILON = SIZE_SCALE / 2;

const CHUNK_SIZE = 64;

interface SizeChunk {
  sizes: Int32Array;
  length: number;
  total: number;
}

export class MeasurementDynamicLazy implements CalculationNode, Measurement {
  private listeners = new Set<() => void>();
  private pendingSizes = new Map<number, number>();

  private processingSizes = new Map<number, number>();
  private chunks: SizeChunk[] = [];
  private chunkOffsets: number[] = [0];

  private total: TotalScrollSize;
  private readonly estimatedSize: number;

  private listSize: number;
  private materializedRowCount = 0;
  private materializedTotal = 0;

  private version = -1;

  private highestBit = 0;

  constructor(
    listSize: number,
    viewPortSize: number,
    estimatedSize: number,
    overscan: number,
  ) {
    this.listSize = listSize;

    this.estimatedSize = this.toInternal(estimatedSize);

    const endIndex = Math.min(
      Math.floor(viewPortSize / estimatedSize) + overscan,
      listSize - 1,
    );

    const initialRowCount = endIndex + 1;

    this.appendRows(initialRowCount);

    this.total = new TotalScrollSize(listSize * this.estimatedSize);

    this.materializedTotal = initialRowCount * this.estimatedSize;

    this.calculate = this.calculate.bind(this);

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

      const chunkIndex = Math.floor(rowIndex / CHUNK_SIZE);

      const localIndex = rowIndex % CHUNK_SIZE;

      const chunk = this.chunks[chunkIndex];

      const prevSize = chunk.sizes[localIndex];

      const difference = rowSize - prevSize;

      if (Math.abs(difference) <= SIZE_EPSILON) {
        continue;
      }

      chunk.sizes[localIndex] = rowSize;

      chunk.total += difference;
      fenwickAdd(this.chunkOffsets, chunkIndex + 1, difference);

      this.total.updateTotal(prevSize, rowSize);
      this.materializedTotal += difference;
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

    if (this.materializedRowCount === 0) {
      return 0;
    }

    const chunkIndex = fenwickFindByPrefixSum(
      this.chunkOffsets,
      this.highestBit,
      internalOffset,
    );

    if (chunkIndex >= this.chunks.length) {
      return Math.min(this.materializedRowCount, this.listSize);
    }

    const chunkStartOffset = fenwickSum(this.chunkOffsets, chunkIndex);

    const offsetInsideChunk = internalOffset - chunkStartOffset;

    const chunk = this.chunks[chunkIndex];

    let localOffset = 0;

    for (let localIndex = 0; localIndex < chunk.length; localIndex++) {
      const nextOffset = localOffset + chunk.sizes[localIndex];
      if (offsetInsideChunk < nextOffset) {
        return chunkIndex * CHUNK_SIZE + localIndex;
      }

      localOffset = nextOffset;
    }
    return Math.min((chunkIndex + 1) * CHUNK_SIZE, this.listSize);
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

  getSize(index: number): number {
    if (index >= this.materializedRowCount) {
      return this.toExternal(this.estimatedSize);
    }

    return this.toExternal(this.getInternalSize(index));
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

  updateListSize(nextListSize: number): void {
    if (nextListSize === this.listSize) {
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

    for (const treeIndex of this.pendingSizes.keys()) {
      if (treeIndex > nextListSize) {
        this.pendingSizes.delete(treeIndex);
      }
    }

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

  private prefill(requiredRows: number): void {
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

    const growth = Math.max(64, Math.ceil(oldLength * 0.5));

    const newLength = Math.max(
      requiredLength,
      Math.min(maxLength, oldLength + growth),
    );

    const newRowCount = newLength - 1;

    const addedCount = newRowCount - this.materializedRowCount;

    if (addedCount <= 0) {
      return;
    }

    this.appendRows(addedCount);

    this.materializedTotal += addedCount * this.estimatedSize;

    this.rebuildChunkFenwick();
  }

  private appendRows(count: number): void {
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

      lastChunk.sizes.fill(this.estimatedSize, start, end);

      lastChunk.length = end;

      lastChunk.total += addCount * this.estimatedSize;

      this.materializedRowCount += addCount;

      remaining -= addCount;
    }

    while (remaining > 0) {
      const length = Math.min(CHUNK_SIZE, remaining);

      const sizes = new Int32Array(CHUNK_SIZE);

      sizes.fill(this.estimatedSize, 0, length);

      this.chunks.push({
        sizes,
        length,
        total: length * this.estimatedSize,
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
