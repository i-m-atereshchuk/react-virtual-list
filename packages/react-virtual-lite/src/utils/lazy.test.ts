import { describe, expect, it } from "vitest";

import { LAZY_MEASUREMENT_SIZE_RATIO } from "../constants/lazy";

import { getRenderRangeSize, shouldUseLazyMeasurement } from "./lazy";

describe("getRenderRangeSize", () => {
  it("covers the viewport plus overscan for a large list", () => {
    expect(getRenderRangeSize(1000, 500, 100, 3)).toBe(9);
  });

  it("rounds down partial rows before adding overscan", () => {
    expect(getRenderRangeSize(1000, 550, 100, 2)).toBe(8);
  });

  it("is capped by the list size when the list is smaller than the viewport", () => {
    expect(getRenderRangeSize(5, 500, 100, 3)).toBe(5);
  });

  it("returns 1 for a single-item list regardless of the viewport", () => {
    expect(getRenderRangeSize(1, 500, 100, 3)).toBe(1);
  });

  it("returns 0 for an empty list", () => {
    expect(getRenderRangeSize(0, 500, 100, 3)).toBe(0);
  });

  it("returns at least 1 row when the viewport fits less than a full row", () => {
    expect(getRenderRangeSize(1000, 50, 100, 0)).toBe(1);
  });

  it("adds overscan even when the viewport itself is empty", () => {
    expect(getRenderRangeSize(1000, 0, 100, 10)).toBe(11);
  });
});

describe("shouldUseLazyMeasurement", () => {
  it("returns false when the list is well within the ratio", () => {
    expect(shouldUseLazyMeasurement(50, 10)).toBe(false);
  });

  it("returns false exactly at the ratio boundary", () => {
    expect(shouldUseLazyMeasurement(10 * LAZY_MEASUREMENT_SIZE_RATIO, 10)).toBe(
      false,
    );
  });

  it("returns true just past the ratio boundary", () => {
    expect(
      shouldUseLazyMeasurement(10 * LAZY_MEASUREMENT_SIZE_RATIO + 1, 10),
    ).toBe(true);
  });

  it("returns true for a large list rendered through a small window", () => {
    expect(shouldUseLazyMeasurement(1_000_000, 20)).toBe(true);
  });

  it("returns false when both values are zero, without dividing by zero", () => {
    expect(shouldUseLazyMeasurement(0, 0)).toBe(false);
  });

  it("returns true for a non-empty list against a zero render range", () => {
    expect(shouldUseLazyMeasurement(1, 0)).toBe(true);
  });
});

describe("getRenderRangeSize + shouldUseLazyMeasurement", () => {
  it("never selects lazy measurement when the whole list fits in the render range", () => {
    const listSize = 50;

    const renderRangeSize = getRenderRangeSize(listSize, 10_000, 10, 3);

    expect(renderRangeSize).toBe(listSize);
    expect(shouldUseLazyMeasurement(listSize, renderRangeSize)).toBe(false);
  });

  it("selects lazy measurement for a huge list behind a small viewport", () => {
    const listSize = 1_000_000;

    const renderRangeSize = getRenderRangeSize(listSize, 600, 40, 3);

    expect(shouldUseLazyMeasurement(listSize, renderRangeSize)).toBe(true);
  });

  it("does not select lazy measurement right at the ratio boundary", () => {
    const renderRangeSize = getRenderRangeSize(120, 100, 10, 0);

    expect(renderRangeSize).toBe(11);
    expect(
      shouldUseLazyMeasurement(
        renderRangeSize * LAZY_MEASUREMENT_SIZE_RATIO,
        renderRangeSize,
      ),
    ).toBe(false);
  });

  it("does not select lazy measurement for an empty list", () => {
    const listSize = 0;

    const renderRangeSize = getRenderRangeSize(listSize, 500, 100, 3);

    expect(shouldUseLazyMeasurement(listSize, renderRangeSize)).toBe(false);
  });
});
