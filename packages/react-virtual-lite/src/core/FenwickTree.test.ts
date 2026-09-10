import { describe, expect, it } from "vitest";

import {
  fenwickAdd,
  fenwickFindByPrefixSum,
  fenwickHighestBit,
  fenwickRebuildRange,
  fenwickSum,
} from "./FenwickTree";

/** Builds a fresh Fenwick tree from 1-indexed row sizes (index 0 unused). */
function buildTree(sizes: number[]) {
  const offsets = new Array(sizes.length).fill(0);

  fenwickRebuildRange(offsets, sizes, 1, sizes.length);

  return offsets;
}

describe("fenwickSum / fenwickAdd", () => {
  it("returns 0 for index 0", () => {
    const offsets = buildTree([0, 10, 20, 30]);

    expect(fenwickSum(offsets, 0)).toBe(0);
  });

  it("returns the prefix sum of raw sizes up to index", () => {
    const sizes = [0, 10, 20, 30, 40];
    const offsets = buildTree(sizes);

    expect(fenwickSum(offsets, 1)).toBe(10);
    expect(fenwickSum(offsets, 2)).toBe(30);
    expect(fenwickSum(offsets, 3)).toBe(60);
    expect(fenwickSum(offsets, 4)).toBe(100);
  });

  it("reflects an fenwickAdd'd difference in later sums", () => {
    const sizes = [0, 10, 20, 30, 40];
    const offsets = buildTree(sizes);

    fenwickAdd(offsets, 2, 5); // sizes[2]: 20 -> 25

    expect(fenwickSum(offsets, 1)).toBe(10);
    expect(fenwickSum(offsets, 2)).toBe(35);
    expect(fenwickSum(offsets, 3)).toBe(65);
    expect(fenwickSum(offsets, 4)).toBe(105);
  });

  it("supports a single-element tree", () => {
    const offsets = buildTree([0, 42]);

    expect(fenwickSum(offsets, 1)).toBe(42);
  });
});

describe("fenwickHighestBit", () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 4],
    [8, 4],
    [9, 8],
    [1000, 512],
  ])("returns the highest power of two below %i -> %i", (length, expected) => {
    expect(fenwickHighestBit(length)).toBe(expected);
  });
});

describe("fenwickFindByPrefixSum", () => {
  it("finds the largest index whose prefix sum is <= offset", () => {
    const sizes = [0, 10, 20, 30, 40];
    const offsets = buildTree(sizes);
    const highestBit = fenwickHighestBit(offsets.length);

    // Prefix sums: index 1 -> 10, 2 -> 30, 3 -> 60, 4 -> 100
    expect(fenwickFindByPrefixSum(offsets, highestBit, 0)).toBe(0);
    expect(fenwickFindByPrefixSum(offsets, highestBit, 9)).toBe(0);
    expect(fenwickFindByPrefixSum(offsets, highestBit, 10)).toBe(1);
    expect(fenwickFindByPrefixSum(offsets, highestBit, 29)).toBe(1);
    expect(fenwickFindByPrefixSum(offsets, highestBit, 30)).toBe(2);
    expect(fenwickFindByPrefixSum(offsets, highestBit, 100)).toBe(4);
    expect(fenwickFindByPrefixSum(offsets, highestBit, 1000)).toBe(4);
  });
});

describe("fenwickRebuildRange", () => {
  it("builds an equivalent tree to inserting sizes one at a time", () => {
    const sizes = [0, 5, 15, 25, 35, 45];
    const offsets = buildTree(sizes);

    for (let i = 1; i < sizes.length; i++) {
      const expectedPrefixSum = sizes
        .slice(0, i + 1)
        .reduce((a, b) => a + b, 0);

      expect(fenwickSum(offsets, i)).toBe(expectedPrefixSum);
    }
  });

  it("re-parents existing nodes when extending an already-built tree", () => {
    const sizes = [0, 10, 20, 30, 40, 50, 60, 70];

    // Build only the first half...
    const offsets = new Array(sizes.length).fill(0);

    fenwickRebuildRange(offsets, sizes, 1, 4);

    // ...then extend it to the full range, as growTo() does.
    fenwickRebuildRange(offsets, sizes, 4, sizes.length);

    for (let i = 1; i < sizes.length; i++) {
      const expectedPrefixSum = sizes
        .slice(0, i + 1)
        .reduce((a, b) => a + b, 0);

      expect(fenwickSum(offsets, i)).toBe(expectedPrefixSum);
    }
  });

  it("does nothing for an empty range", () => {
    const sizes = [0, 10, 20];
    const offsets = new Array(sizes.length).fill(0);

    fenwickRebuildRange(offsets, sizes, 1, 1);

    expect(offsets).toEqual([0, 0, 0]);
  });
});
