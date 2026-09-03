import { describe, expect, it } from "vitest";

import { SizeEstimator } from "./SizeEstimator";

describe("SizeEstimator", () => {
  it("returns default size when no sizes were added", () => {
    const estimator = new SizeEstimator(100);

    expect(estimator.getEstimatedSize()).toBe(100);
  });

  it("returns the added size when only one size exists", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(120, 0);

    expect(estimator.getEstimatedSize()).toBe(120);
  });

  it("returns the average of added sizes", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 0);
    estimator.addSize(200, 1);
    estimator.addSize(300, 2);

    expect(estimator.getEstimatedSize()).toBe(200);
  });

  it("supports fractional sizes", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(10.5, 0);
    estimator.addSize(20.25, 1);

    expect(estimator.getEstimatedSize()).toBeCloseTo(15.375);
  });

  it("updates the average when an existing size changes", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 0);
    estimator.addSize(200, 1);

    expect(estimator.getEstimatedSize()).toBe(150);

    estimator.addSize(300, 0);

    expect(estimator.getEstimatedSize()).toBe(250);
  });

  it("updates an existing fractional size", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(10.5, 0);
    estimator.addSize(20.5, 1);

    estimator.addSize(15.5, 0);

    expect(estimator.getEstimatedSize()).toBeCloseTo(18);
  });

  it("does not count the same index more than once", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 0);
    estimator.addSize(200, 0);

    expect(estimator.getEstimatedSize()).toBe(200);
  });

  it("does not change the estimate when the same size is added again", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 0);
    estimator.addSize(200, 1);

    estimator.addSize(100, 0);

    expect(estimator.getEstimatedSize()).toBe(150);
  });

  it("throws when size is 0", () => {
    const estimator = new SizeEstimator(100);

    expect(() => {
      estimator.addSize(0, 0);
    }).toThrow("Size must be greater than 0");
  });

  it("keeps existing state when adding size 0 throws", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 0);
    estimator.addSize(200, 1);

    expect(() => {
      estimator.addSize(0, 0);
    }).toThrow("Size must be greater than 0");

    expect(estimator.getEstimatedSize()).toBe(150);
  });

  it("supports sparse indexes", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 0);
    estimator.addSize(300, 10);

    expect(estimator.getEstimatedSize()).toBe(200);
  });

  it("does not include empty indexes in the average", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 2);
    estimator.addSize(300, 20);

    expect(estimator.getEstimatedSize()).toBe(200);
  });

  describe("capacity", () => {
    it("supports index equal to the initial capacity", () => {
      const estimator = new SizeEstimator(100, 4);

      estimator.addSize(200, 4);

      expect(estimator.getEstimatedSize()).toBe(200);
    });

    it("grows capacity for indexes larger than the initial capacity", () => {
      const estimator = new SizeEstimator(100, 2);

      estimator.addSize(100, 0);
      estimator.addSize(200, 1);
      estimator.addSize(300, 10);

      expect(estimator.getEstimatedSize()).toBe(200);
    });

    it("preserves existing values after growing capacity", () => {
      const estimator = new SizeEstimator(100, 2);

      estimator.addSize(100.5, 0);
      estimator.addSize(200.5, 1);

      estimator.addSize(300.5, 10);

      expect(estimator.getEstimatedSize()).toBeCloseTo(200.5);

      estimator.addSize(400.5, 0);

      expect(estimator.getEstimatedSize()).toBeCloseTo(
        (400.5 + 200.5 + 300.5) / 3,
      );
    });

    it("supports zero initial capacity", () => {
      const estimator = new SizeEstimator(100, 0);

      estimator.addSize(200, 0);

      expect(estimator.getEstimatedSize()).toBe(200);
    });

    it("supports a large sparse index", () => {
      const estimator = new SizeEstimator(100, 1);

      estimator.addSize(250, 1000);

      expect(estimator.getEstimatedSize()).toBe(250);
    });
  });

  it("supports multiple updates of the same index", () => {
    const estimator = new SizeEstimator(100);

    estimator.addSize(100, 0);
    estimator.addSize(200, 1);
    estimator.addSize(300, 2);

    expect(estimator.getEstimatedSize()).toBe(200);

    estimator.addSize(400, 0);

    expect(estimator.getEstimatedSize()).toBe(300);

    estimator.addSize(500, 1);

    expect(estimator.getEstimatedSize()).toBe(400);

    estimator.addSize(600, 2);

    expect(estimator.getEstimatedSize()).toBe(500);
  });
});
