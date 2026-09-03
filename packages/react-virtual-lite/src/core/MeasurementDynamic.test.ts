import { describe, expect, it, vi } from "vitest";

import { SizeEstimator } from "./SizeEstimator";

import { MeasurementDynamic } from "./MeasurementDynamic";

describe("MeasurementDynamic", () => {
  const createMeasurement = (
    listSize = 5,
    defaultSize = 100,
    initialCapacity = 16,
  ) => {
    const sizeEstimator = new SizeEstimator(defaultSize, initialCapacity);

    const measurement = new MeasurementDynamic(listSize, sizeEstimator);

    return {
      measurement,
      sizeEstimator,
    };
  };

  describe("initial state", () => {
    it("starts with version -1", () => {
      const { measurement } = createMeasurement();

      expect(measurement.getVersion()).toBe(-1);
    });

    it("returns estimated size for every row", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.getSize(0)).toBe(100);
      expect(measurement.getSize(1)).toBe(100);
      expect(measurement.getSize(4)).toBe(100);
    });

    it("returns initial total size", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.getTotal()).toBe(500);
    });

    it("returns zero offset for the first row", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.getOffset(0)).toBe(0);
    });

    it("returns offsets based on estimated size", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.getOffset(1)).toBe(100);
      expect(measurement.getOffset(2)).toBe(200);
      expect(measurement.getOffset(4)).toBe(400);
    });
  });

  describe("setRowSize", () => {
    it("returns true when row size changes by more than 0.5", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.setRowSize(2, 120)).toBe(true);
    });

    it("returns false when row size does not change", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.setRowSize(2, 100)).toBe(false);
    });

    it("returns false when difference is exactly 0.5", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.setRowSize(2, 100.5)).toBe(false);
    });

    it("returns false when difference is less than 0.5", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.setRowSize(2, 100.4)).toBe(false);
    });

    it("returns true when difference is greater than 0.5", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.setRowSize(2, 100.51)).toBe(true);
    });

    it("does not apply size until calculate is called", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(2, 150);

      expect(measurement.getSize(2)).toBe(100);
      expect(measurement.getTotal()).toBe(500);

      measurement.calculate();

      expect(measurement.getSize(2)).toBe(150);
      expect(measurement.getTotal()).toBe(550);
    });
  });

  describe("calculate", () => {
    it("applies pending row size", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(2, 150);

      measurement.calculate();

      expect(measurement.getSize(2)).toBe(150);
    });

    it("updates total when row grows", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(2, 150);

      measurement.calculate();

      expect(measurement.getTotal()).toBe(550);
    });

    it("updates total when row shrinks", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(2, 50);

      measurement.calculate();

      expect(measurement.getTotal()).toBe(450);
    });

    it("applies multiple pending sizes", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(0, 50);
      measurement.setRowSize(2, 150);
      measurement.setRowSize(4, 200);

      measurement.calculate();

      expect(measurement.getSize(0)).toBe(50);
      expect(measurement.getSize(2)).toBe(150);
      expect(measurement.getSize(4)).toBe(200);

      expect(measurement.getTotal()).toBe(600);
    });

    it("increments version after calculate", () => {
      const { measurement } = createMeasurement();

      expect(measurement.getVersion()).toBe(-1);

      measurement.calculate();

      expect(measurement.getVersion()).toBe(0);

      measurement.calculate();

      expect(measurement.getVersion()).toBe(1);
    });

    it("uses the latest pending size for the same row", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(2, 120);
      measurement.setRowSize(2, 150);
      measurement.setRowSize(2, 180);

      measurement.calculate();

      expect(measurement.getSize(2)).toBe(180);
      expect(measurement.getTotal()).toBe(580);
    });
  });

  describe("getOffset", () => {
    it("updates offsets after row size changes", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(1, 150);

      measurement.calculate();

      expect(measurement.getOffset(0)).toBe(0);
      expect(measurement.getOffset(1)).toBe(100);
      expect(measurement.getOffset(2)).toBe(250);
      expect(measurement.getOffset(3)).toBe(350);
    });

    it("handles multiple different row sizes", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(0, 50);
      measurement.setRowSize(1, 75);
      measurement.setRowSize(2, 125);

      measurement.calculate();

      expect(measurement.getOffset(0)).toBe(0);
      expect(measurement.getOffset(1)).toBe(50);
      expect(measurement.getOffset(2)).toBe(125);
      expect(measurement.getOffset(3)).toBe(250);
      expect(measurement.getOffset(4)).toBe(350);
    });

    it("recalculates offsets after cache invalidation", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.getOffset(3)).toBe(300);

      measurement.setRowSize(1, 200);
      measurement.calculate();

      measurement.invalidateCache();

      expect(measurement.getOffset(3)).toBe(400);
    });
  });

  describe("findNearestIndex", () => {
    it("returns 0 for offset 0", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.findNearestIndex(0)).toBe(0);
    });

    it("returns index at an exact row boundary", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.findNearestIndex(100)).toBe(1);
      expect(measurement.findNearestIndex(200)).toBe(2);
      expect(measurement.findNearestIndex(400)).toBe(4);
    });

    it("returns the previous row for an offset inside a row", () => {
      const { measurement } = createMeasurement(5, 100);

      expect(measurement.findNearestIndex(99)).toBe(0);
      expect(measurement.findNearestIndex(199)).toBe(1);
      expect(measurement.findNearestIndex(399)).toBe(3);
    });

    it("uses updated row sizes", () => {
      const { measurement } = createMeasurement(5, 100);

      measurement.setRowSize(0, 50);
      measurement.setRowSize(1, 150);

      measurement.calculate();

      expect(measurement.findNearestIndex(0)).toBe(0);
      expect(measurement.findNearestIndex(49)).toBe(0);
      expect(measurement.findNearestIndex(50)).toBe(1);
      expect(measurement.findNearestIndex(199)).toBe(1);
      expect(measurement.findNearestIndex(200)).toBe(2);
    });
  });

  describe("listeners", () => {
    it("notifies subscribers when a size change is queued", () => {
      const { measurement } = createMeasurement();

      const listener = vi.fn();

      measurement.subscribe(listener);

      measurement.setRowSize(2, 150);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not notify subscribers when size change is ignored", () => {
      const { measurement } = createMeasurement(5, 100);

      const listener = vi.fn();

      measurement.subscribe(listener);

      measurement.setRowSize(2, 100.4);

      expect(listener).not.toHaveBeenCalled();
    });

    it("notifies all subscribers", () => {
      const { measurement } = createMeasurement();

      const firstListener = vi.fn();
      const secondListener = vi.fn();

      measurement.subscribe(firstListener);
      measurement.subscribe(secondListener);

      measurement.setRowSize(2, 150);

      expect(firstListener).toHaveBeenCalledTimes(1);
      expect(secondListener).toHaveBeenCalledTimes(1);
    });

    it("does not notify an unsubscribed listener", () => {
      const { measurement } = createMeasurement();

      const listener = vi.fn();

      measurement.subscribe(listener);
      measurement.unsubscribe(listener);

      measurement.setRowSize(2, 150);

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not notify during calculate", () => {
      const { measurement } = createMeasurement();

      const listener = vi.fn();

      measurement.subscribe(listener);

      measurement.setRowSize(2, 150);

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();

      measurement.calculate();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("dynamic growth", () => {
    it("allows setting a size beyond the initial list", () => {
      const { measurement } = createMeasurement(2, 100);

      expect(measurement.setRowSize(5, 150)).toBe(true);

      measurement.calculate();

      expect(measurement.getSize(5)).toBe(150);
    });

    it("extends total size when measuring beyond the initial list", () => {
      const { measurement } = createMeasurement(2, 100);

      expect(measurement.getTotal()).toBe(200);

      measurement.setRowSize(5, 150);
      measurement.calculate();

      // Initial rows:
      // [100, 100]
      //
      // Missing indexes are prefilled using the current estimate.
      // Since the estimator still has no measured rows before prefill,
      // indexes 2, 3, 4 and 5 are initially 100.
      //
      // Then row 5 is changed from 100 -> 150.
      expect(measurement.getTotal()).toBe(650);
    });

    it("returns offsets for dynamically added rows", () => {
      const { measurement } = createMeasurement(2, 100);

      measurement.setRowSize(4, 150);
      measurement.calculate();

      expect(measurement.getOffset(0)).toBe(0);
      expect(measurement.getOffset(1)).toBe(100);
      expect(measurement.getOffset(2)).toBe(200);
      expect(measurement.getOffset(3)).toBe(300);
      expect(measurement.getOffset(4)).toBe(400);
    });
  });

  describe("SizeEstimator integration", () => {
    it("updates the estimator after calculating measured size", () => {
      const sizeEstimator = new SizeEstimator(100);

      const measurement = new MeasurementDynamic(5, sizeEstimator);

      measurement.setRowSize(0, 150);
      measurement.calculate();

      expect(sizeEstimator.getEstimatedSize()).toBe(150);
    });

    it("updates estimator average from multiple measured rows", () => {
      const sizeEstimator = new SizeEstimator(100);

      const measurement = new MeasurementDynamic(5, sizeEstimator);

      measurement.setRowSize(0, 100);
      measurement.setRowSize(1, 200);
      measurement.setRowSize(2, 300);

      measurement.calculate();

      // Row 0 is ignored because it is equal to the initial estimated size,
      // so only changed measurements are queued by setRowSize.
      expect(sizeEstimator.getEstimatedSize()).toBe(250);
    });
  });
});
