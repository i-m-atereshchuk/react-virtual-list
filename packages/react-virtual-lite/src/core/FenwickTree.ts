/**
 * Pure Fenwick-tree (Binary Indexed Tree) operations shared by
 * MeasurementDynamic and MeasurementDynamicLazy. Both classes keep their
 * own 1-indexed `offsets` array (index 0 unused) and `highestBit` cache,
 * but grow/prefill it differently (eager vs lazy), so these are plain
 * functions operating on an array passed in rather than a class owning
 * one -- each caller keeps its own growth strategy around the same core
 * BIT math.
 */

/** Prefix sum of offsets[1..index] -- the BIT "query" operation. */
export function fenwickSum(offsets: number[], index: number): number {
  let sum = 0;

  while (index > 0) {
    sum += offsets[index];
    index -= index & -index;
  }

  return sum;
}

/** Adds `value` at `index` -- the BIT "update" operation. */
export function fenwickAdd(
  offsets: number[],
  index: number,
  value: number,
): void {
  while (index < offsets.length) {
    offsets[index] += value;
    index += index & -index;
  }
}

/** Highest power of two below `length`, used to binary-search the tree. */
export function fenwickHighestBit(length: number): number {
  let bit = 1;

  while (bit * 2 < length) {
    bit *= 2;
  }

  return bit;
}

/**
 * Binary-searches the tree for the largest index whose prefix sum is
 * <= offset -- the O(log n) lookup behind findNearestIndex in both
 * classes.
 */
export function fenwickFindByPrefixSum(
  offsets: number[],
  highestBit: number,
  offset: number,
): number {
  let index = 0;
  let sum = 0;
  let bit = highestBit;

  while (bit !== 0) {
    const next = index + bit;

    if (next < offsets.length && sum + offsets[next] <= offset) {
      sum += offsets[next];
      index = next;
    }

    bit >>= 1;
  }

  return index;
}

/**
 * Rebuilds `offsets` as a Fenwick tree over `sizes` in-place, for the
 * half-open range [start, end). Used both to build the tree from
 * scratch (start=1) and to extend it after growth (start=oldLength):
 * the first loop re-parents existing BIT nodes below `start` into the
 * new (larger) tree shape, and the second folds in the newly added
 * `sizes` entries. With start=1 the first loop is a no-op, since there
 * are no existing nodes yet to re-parent.
 */
export function fenwickRebuildRange(
  offsets: number[],
  sizes: number[],
  start: number,
  end: number,
): void {
  let index = start - 1;

  while (index > 0) {
    const lowbit = index & -index;
    const parent = index + lowbit;

    if (parent < end) {
      offsets[parent] += offsets[index];
    }

    index -= lowbit;
  }

  for (let i = start; i < end; i++) {
    offsets[i] += sizes[i];

    const parent = i + (i & -i);

    if (parent < end) {
      offsets[parent] += offsets[i];
    }
  }
}
