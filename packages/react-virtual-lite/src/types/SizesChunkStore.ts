export type ChunkType = 0 | 1 | 2;

export interface SizesChunkStore {
  type: ChunkType;
  sizes: Int8Array | Int16Array | Int32Array;
  length: number;
  total: number;
  base: number;
  setSize(index: number, value: number): void;
  getSize(index: number): number;
  truncate(newLength: number): number;
}
