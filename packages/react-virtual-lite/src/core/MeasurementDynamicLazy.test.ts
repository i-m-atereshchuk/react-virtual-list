import { describe, expect, it, vi } from "vitest";

import { MeasurementDynamicLazy } from "./MeasurementDynamicLazy";

describe("MeasurementDynamicLazy", () => {
  const createMeasurement = (
    listSize = 5,
    viewPortSize = 500,
    estimatedSize = 100,
    overscan = 3,
  ) =>
    new MeasurementDynamicLazy(listSize, viewPortSize, estimatedSize, overscan);

  const createLargeMeasurement = (
    listSize = 1_000_000,
    viewPortSize = 600,
    estimatedSize = 40,
    overscan = 3,
  ) =>
    new MeasurementDynamicLazy(listSize, viewPortSize, estimatedSize, overscan);

  describe("initial state", () => {
    it("starts with version -1", () => {
      const measurement = createMeasurement();

      expect(measurement.getVersion()).toBe(-1);
    });

    it("returns estimated size for every row", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.getSize(0)).toBe(100);
      expect(measurement.getSize(1)).toBe(100);
      expect(measurement.getSize(4)).toBe(100);
    });

    it("returns initial total size", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.getTotal()).toBe(500);
    });

    it("returns zero offset for the first row", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.getOffset(0)).toBe(0);
    });

    it("returns offsets based on estimated size", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.getOffset(1)).toBe(100);
      expect(measurement.getOffset(2)).toBe(200);
      expect(measurement.getOffset(4)).toBe(400);
    });

    it("only materializes a viewport-sized slice for a large list", () => {
      const measurement = createLargeMeasurement();

      expect(measurement.getTotal()).toBe(1_000_000 * 40);
      expect(measurement.getSize(999_999)).toBe(40);
    });
  });

  describe("setRowSize", () => {
    it("rejects a negative index", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.setRowSize(-1, 150)).toBe(false);
    });

    it("rejects an index at or beyond listSize", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.setRowSize(5, 150)).toBe(false);
      expect(measurement.setRowSize(6, 150)).toBe(false);
    });

    it("rejects a negative size", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.setRowSize(2, -10)).toBe(false);
    });

    it("rejects a non-finite size", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.setRowSize(2, Number.NaN)).toBe(false);
      expect(measurement.setRowSize(2, Number.POSITIVE_INFINITY)).toBe(false);
    });

    it("accepts a size of exactly zero", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.setRowSize(2, 0)).toBe(true);
    });

    it("returns true on the very first measurement, even one matching the estimate", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.setRowSize(2, 100)).toBe(true);
    });

    it("returns false when a later row size does not change", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 120);
      measurement.calculate();

      expect(measurement.setRowSize(2, 120)).toBe(false);
    });

    it("returns false when difference is exactly 0.5", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 150);
      measurement.calculate();

      expect(measurement.setRowSize(2, 150.5)).toBe(false);
    });

    it("returns false when difference is less than 0.5", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 150);
      measurement.calculate();

      expect(measurement.setRowSize(2, 150.4)).toBe(false);
    });

    it("returns true when difference is greater than 0.5", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 150);
      measurement.calculate();

      expect(measurement.setRowSize(2, 150.51)).toBe(true);
    });

    it("does not apply the size until calculate is called", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 150);

      expect(measurement.getSize(2)).toBe(100);
      expect(measurement.getTotal()).toBe(500);

      measurement.calculate();

      expect(measurement.getSize(2)).toBe(150);
      expect(measurement.getTotal()).toBe(550);
    });

    it("accepts a row far beyond the initially materialized range", () => {
      const measurement = createLargeMeasurement();

      expect(measurement.setRowSize(999_999, 80)).toBe(true);
    });
  });

  describe("calculate", () => {
    it("does nothing when there is nothing pending", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.calculate();

      expect(measurement.getVersion()).toBe(-1);
    });

    it("applies pending row size", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 150);
      measurement.calculate();

      expect(measurement.getSize(2)).toBe(150);
    });

    it("updates total when row grows", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 150);
      measurement.calculate();

      expect(measurement.getTotal()).toBe(550);
    });

    it("updates total when row shrinks", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 50);
      measurement.calculate();

      expect(measurement.getTotal()).toBe(450);
    });

    it("applies multiple pending sizes", () => {
      const measurement = createMeasurement(5, 500, 100);

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
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.getVersion()).toBe(-1);

      measurement.setRowSize(0, 1);
      measurement.calculate();

      expect(measurement.getVersion()).toBe(0);

      measurement.setRowSize(0, 12);
      measurement.calculate();

      expect(measurement.getVersion()).toBe(1);
    });

    it("uses the latest pending size for the same row", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 120);
      measurement.setRowSize(2, 150);
      measurement.setRowSize(2, 180);

      measurement.calculate();

      expect(measurement.getSize(2)).toBe(180);
      expect(measurement.getTotal()).toBe(580);
    });

    it("materializes a row far beyond the initial window when measured", () => {
      const measurement = createLargeMeasurement();

      measurement.setRowSize(5_000, 80);
      measurement.calculate();

      expect(measurement.getSize(5_000)).toBe(80);
      expect(measurement.getTotal()).toBe(1_000_000 * 40 + (80 - 40));
    });
  });

  describe("getOffset", () => {
    it("updates offsets after row size changes", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(1, 150);
      measurement.calculate();

      expect(measurement.getOffset(0)).toBe(0);
      expect(measurement.getOffset(1)).toBe(100);
      expect(measurement.getOffset(2)).toBe(250);
      expect(measurement.getOffset(3)).toBe(350);
    });

    it("handles multiple different row sizes", () => {
      const measurement = createMeasurement(5, 500, 100);

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

    it("lazily grows to resolve a far, never-touched row", () => {
      const measurement = createLargeMeasurement();

      expect(measurement.getOffset(1_000)).toBe(1_000 * 40);
    });

    it("caches the offset once resolved", () => {
      const measurement = createLargeMeasurement();

      const first = measurement.getOffset(1_000);
      const second = measurement.getOffset(1_000);

      expect(first).toBe(second);
    });
  });

  describe("getSize", () => {
    it("returns the estimated size for an unmeasured row", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.getSize(3)).toBe(100);
    });

    it("returns the estimated size for a row beyond the materialized array", () => {
      const measurement = createLargeMeasurement();

      expect(measurement.getSize(500)).toBe(40);
    });

    it("returns the measured size after calculate", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(3, 222);
      measurement.calculate();

      expect(measurement.getSize(3)).toBe(222);
    });
  });

  describe("getTotal", () => {
    it("returns listSize * estimatedSize before anything is measured", () => {
      const measurement = createMeasurement(10, 500, 40);

      expect(measurement.getTotal()).toBe(400);
    });
  });

  describe("findNearestIndex", () => {
    it("returns 0 for offset 0", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.findNearestIndex(0)).toBe(0);
    });

    it("returns 0 for a negative offset", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.findNearestIndex(-50)).toBe(0);
    });

    it("returns index at an exact row boundary", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.findNearestIndex(100)).toBe(1);
      expect(measurement.findNearestIndex(200)).toBe(2);
      expect(measurement.findNearestIndex(400)).toBe(4);
    });

    it("returns the previous row for an offset inside a row", () => {
      const measurement = createMeasurement(5, 500, 100);

      expect(measurement.findNearestIndex(99)).toBe(0);
      expect(measurement.findNearestIndex(199)).toBe(1);
      expect(measurement.findNearestIndex(399)).toBe(3);
    });

    it("uses updated row sizes", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(0, 50);
      measurement.setRowSize(1, 150);

      measurement.calculate();

      expect(measurement.findNearestIndex(0)).toBe(0);
      expect(measurement.findNearestIndex(49)).toBe(0);
      expect(measurement.findNearestIndex(50)).toBe(1);
      expect(measurement.findNearestIndex(199)).toBe(1);
      expect(measurement.findNearestIndex(200)).toBe(2);
    });

    it("resolves a deep offset in a large, mostly unmaterialized list", () => {
      const measurement = createLargeMeasurement();

      expect(measurement.findNearestIndex(4_000)).toBe(100);
      expect(measurement.findNearestIndex(999_960)).toBe(24_999);
    });

    it("reflects a measured row deep inside a large list", () => {
      const measurement = createLargeMeasurement();

      measurement.setRowSize(5_000, 1_000);
      measurement.calculate();

      const offsetOfRow5000 = 5_000 * 40;

      expect(measurement.findNearestIndex(offsetOfRow5000)).toBe(5_000);
      expect(measurement.findNearestIndex(offsetOfRow5000 + 999)).toBe(5_000);
      expect(measurement.findNearestIndex(offsetOfRow5000 + 1_000)).toBe(5_001);
    });
  });

  describe("listeners", () => {
    it("notifies subscribers when a size change is queued", () => {
      const measurement = createMeasurement(5, 500, 100);

      const listener = vi.fn();

      measurement.subscribe(listener);
      measurement.setRowSize(2, 150);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies even on a first measurement that matches the estimate", () => {
      const measurement = createMeasurement(5, 500, 100);

      const listener = vi.fn();

      measurement.subscribe(listener);
      measurement.setRowSize(2, 100);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not notify subscribers when a later size change is ignored", () => {
      const measurement = createMeasurement(5, 500, 100);

      measurement.setRowSize(2, 150);
      measurement.calculate();

      const listener = vi.fn();

      measurement.subscribe(listener);
      measurement.setRowSize(2, 150.4);

      expect(listener).not.toHaveBeenCalled();
    });

    it("notifies all subscribers", () => {
      const measurement = createMeasurement(5, 500, 100);

      const firstListener = vi.fn();
      const secondListener = vi.fn();

      measurement.subscribe(firstListener);
      measurement.subscribe(secondListener);

      measurement.setRowSize(2, 150);

      expect(firstListener).toHaveBeenCalledTimes(1);
      expect(secondListener).toHaveBeenCalledTimes(1);
    });

    it("does not notify an unsubscribed listener", () => {
      const measurement = createMeasurement(5, 500, 100);

      const listener = vi.fn();

      measurement.subscribe(listener);
      measurement.unsubscribe(listener);

      measurement.setRowSize(2, 150);

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not notify during calculate", () => {
      const measurement = createMeasurement(5, 500, 100);

      const listener = vi.fn();

      measurement.subscribe(listener);
      measurement.setRowSize(2, 150);

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();
      measurement.calculate();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("updateListSize", () => {
    it("does nothing when the size does not change", () => {
      const measurement = createMeasurement(5, 500, 100);

      const listener = vi.fn();

      measurement.subscribe(listener);
      const versionBefore = measurement.getVersion();

      measurement.updateListSize(5);

      expect(measurement.getTotal()).toBe(500);
      expect(measurement.getVersion()).toBe(versionBefore);
      expect(listener).not.toHaveBeenCalled();
    });

    describe("growing", () => {
      it("increases total by estimatedSize per added row", () => {
        const measurement = createLargeMeasurement(100, 600, 40, 3);

        expect(measurement.getTotal()).toBe(4_000);

        measurement.updateListSize(150);

        expect(measurement.getTotal()).toBe(6_000);
      });

      it("accepts measuring a row that used to be out of range", () => {
        const measurement = createMeasurement(5, 500, 100);

        expect(measurement.setRowSize(5, 150)).toBe(false);

        measurement.updateListSize(10);

        expect(measurement.setRowSize(5, 150)).toBe(true);
      });

      it("resolves offsets and indexes in the newly added range", () => {
        const measurement = createMeasurement(10, 500, 100, 3);

        measurement.updateListSize(20);

        expect(measurement.getOffset(15)).toBe(1_500);
        expect(measurement.findNearestIndex(1_500)).toBe(15);
      });

      it("returns the estimated size for newly added rows", () => {
        const measurement = createMeasurement(5, 500, 100);

        measurement.updateListSize(10);

        expect(measurement.getSize(7)).toBe(100);
      });

      it("notifies subscribers and bumps the version", () => {
        const measurement = createMeasurement(5, 500, 100);

        const listener = vi.fn();

        measurement.subscribe(listener);
        const versionBefore = measurement.getVersion();

        measurement.updateListSize(10);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(measurement.getVersion()).toBe(versionBefore + 1);
      });
    });

    describe("shrinking", () => {
      it("decreases total by estimatedSize per removed row", () => {
        const measurement = createMeasurement(100, 600, 40, 3);

        expect(measurement.getTotal()).toBe(4_000);

        measurement.updateListSize(50);

        expect(measurement.getTotal()).toBe(2_000);
      });

      it("accounts for the real measured size of removed rows", () => {
        const measurement = createMeasurement(100, 600, 40, 3);

        measurement.setRowSize(95, 500);
        measurement.calculate();

        expect(measurement.getTotal()).toBe(4_460);

        measurement.updateListSize(50);

        expect(measurement.getTotal()).toBe(2_000);
      });

      it("rejects setRowSize for a row at or beyond the new listSize", () => {
        const measurement = createMeasurement(100, 600, 40, 3);

        measurement.updateListSize(50);

        expect(measurement.setRowSize(50, 200)).toBe(false);
        expect(measurement.setRowSize(95, 200)).toBe(false);
      });

      it("keeps offsets/total consistent when the materialized region is far smaller than the new listSize", () => {
        // Regression test: shrinking a huge, barely-materialized list
        // used to blindly set `sizes.length`/`offsets.length` to
        // `nextListSize + 1`, which -- since that is *larger* than
        // the handful of already-materialized slots -- grew the
        // arrays with empty holes instead of truncating them,
        // producing NaN offsets.
        const measurement = createLargeMeasurement();

        measurement.updateListSize(500_000);

        expect(measurement.getTotal()).toBe(500_000 * 40);

        const offset = measurement.getOffset(200);

        expect(offset).toBe(200 * 40);
        expect(Number.isNaN(offset)).toBe(false);

        expect(measurement.findNearestIndex(4_000)).toBe(100);
      });

      it("drops queued measurements for rows that no longer exist", () => {
        const measurement = createMeasurement(100, 600, 40, 3);

        expect(measurement.setRowSize(95, 500)).toBe(true);

        measurement.updateListSize(50);

        expect(measurement.getTotal()).toBe(2_000);

        measurement.calculate();

        expect(measurement.getTotal()).toBe(2_000);
        expect(measurement.getSize(95)).toBe(40);
      });

      it("notifies subscribers and bumps the version", () => {
        const measurement = createMeasurement(100, 600, 40, 3);

        const listener = vi.fn();

        measurement.subscribe(listener);
        const versionBefore = measurement.getVersion();

        measurement.updateListSize(50);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(measurement.getVersion()).toBe(versionBefore + 1);
      });
    });

    it("supports a grow-then-shrink round trip back to the same total", () => {
      const measurement = createMeasurement(20, 500, 40, 3);

      expect(measurement.getTotal()).toBe(800);

      measurement.updateListSize(200);
      expect(measurement.getTotal()).toBe(8_000);

      measurement.updateListSize(20);
      expect(measurement.getTotal()).toBe(800);
    });
  });
});
