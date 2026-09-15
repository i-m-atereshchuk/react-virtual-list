import { type ChunkType, type SizesChunkStore } from "../types/SizesChunkStore";

export class SizeChunk implements SizesChunkStore {
  type: ChunkType;
  sizes:
    | Int8Array<ArrayBufferLike>
    | Int16Array<ArrayBufferLike>
    | Int32Array<ArrayBufferLike>;
  length: number;
  total: number;
  base: number;

  private readonly capacity: number;

  constructor(base: number, capacity: number) {
    this.base = base;
    this.capacity = capacity;
    this.length = 0;
    this.total = 0;
    this.sizes = new Int8Array(capacity);
    this.type = 0;
  }

  setSize(index: number, value: number): void {
    const delta = value - this.base;
    const isNewSlot = index >= this.length;
    const prevDelta = isNewSlot ? 0 : this.sizes[index];

    const { should, type } = this.shouldPromote(delta);

    if (should) {
      this.promote(type);
    }

    this.sizes[index] = delta;

    if (isNewSlot) {
      const skipped = index - this.length;

      this.total += skipped * this.base + value;

      this.length = index + 1;
    } else {
      this.total += delta - prevDelta;
    }
  }

  getSize(index: number): number {
    return this.sizes[index] + this.base;
  }

  truncate(newLength: number): number {
    let removed = 0;

    for (let i = newLength; i < this.length; i++) {
      removed += this.getSize(i);
    }

    this.length = newLength;
    this.total -= removed;

    return removed;
  }

  private shouldPromote(delta: number): { type: ChunkType; should: boolean } {
    if (delta >= -128 && delta <= 127) {
      return {
        type: 0,
        should: this.type < 0,
      };
    }

    if (delta >= -32_768 && delta <= 32_767) {
      return {
        type: 1,
        should: this.type < 1,
      };
    }

    return {
      type: 2,
      should: this.type < 2,
    };
  }

  private promote(type: ChunkType): void {
    let next:
      | Int8Array<ArrayBufferLike>
      | Int16Array<ArrayBufferLike>
      | Int32Array<ArrayBufferLike>;

    switch (type) {
      case 1:
        next = new Int16Array(this.capacity);
        break;

      case 2:
        next = new Int32Array(this.capacity);
        break;

      default:
        return;
    }

    next.set(this.sizes);

    this.sizes = next;
    this.type = type;
  }
}
