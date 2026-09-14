import { describe, expect, it, vi } from "vitest";

import { MeasurementChunkedBase, SIZE_SCALE } from "./MeasurementChunkedBase";

class TestMeasurementChunked extends MeasurementChunkedBase {
  private readonly defaultSize: number;

  constructor(listSize = 5, defaultSize = 100, initialRowCount = listSize) {
    super(listSize);

    this.defaultSize = this.toInternal(defaultSize);

    this.appendRows(initialRowCount, this.defaultSize);

    this.initializeTotal(initialRowCount * this.defaultSize);

    this.rebuildChunkFenwick();
  }

  calculate(): void {}

  setRowSize(): boolean {
    return false;
  }

  getSize(index: number): number {
    return this.toExternal(this.getInternalSize(index));
  }

  findNearestIndex(offset: number): number {
    return this.findIndexByInternalOffset(offset * SIZE_SCALE, this.listSize);
  }

  updateListSize(): void {}

  protected prefill(requiredRows: number): void {
    if (requiredRows <= this.materializedRowCount) {
      return;
    }

    const addedCount = requiredRows - this.materializedRowCount;

    this.appendRows(addedCount, this.defaultSize);

    this.total.updateTotal(0, addedCount * this.defaultSize);

    this.rebuildChunkFenwick();
  }

  commitSize(index: number, size: number) {
    return this.commitInternalSize(index, this.toInternal(size));
  }

  append(count: number, size: number): void {
    this.appendRows(count, this.toInternal(size));

    this.total.updateTotal(0, count * this.toInternal(size));

    this.rebuildChunkFenwick();
  }

  truncate(nextRowCount: number): number {
    const removedInternal = this.truncateRows(nextRowCount);

    this.total.updateTotal(removedInternal, 0);

    this.rebuildChunkFenwick();

    return this.toExternal(removedInternal);
  }

  nextTestVersion(): void {
    this.nextVersion();
  }

  notifyTestListeners(): void {
    this.notify();
  }

  setPending(treeIndex: number, size: number): void {
    this.pendingSizes.set(treeIndex, this.toInternal(size));
  }

  deletePendingAfter(treeIndex: number): void {
    this.deletePendingSizesAfter(treeIndex);
  }

  getPendingIndexes(): number[] {
    return [...this.pendingSizes.keys()];
  }

  getMaterializedRowCount(): number {
    return this.materializedRowCount;
  }
}

describe("MeasurementChunkedBase", () => {
  const createMeasurement = (
    listSize = 5,
    defaultSize = 100,
    initialRowCount = listSize,
  ) => new TestMeasurementChunked(listSize, defaultSize, initialRowCount);

  describe("initial state", () => {
    it("starts with version -1", () => {
      const measurement = createMeasurement();

      expect(measurement.getVersion()).toBe(-1);
    });

    it("returns initial total size", () => {
      const measurement = createMeasurement(5, 100);

      expect(measurement.getTotal()).toBe(500);
    });

    it("returns zero offset for the first row", () => {
      const measurement = createMeasurement();

      expect(measurement.getOffset(0)).toBe(0);
    });

    it("returns offsets based on stored row sizes", () => {
      const measurement = createMeasurement(5, 100);

      expect(measurement.getOffset(1)).toBe(100);

      expect(measurement.getOffset(2)).toBe(200);

      expect(measurement.getOffset(4)).toBe(400);
    });
  });

  describe("getOffset", () => {
    it("uses updated chunk totals after a row changes", () => {
      const measurement = createMeasurement(5, 100);

      measurement.commitSize(1, 150);

      expect(measurement.getOffset(0)).toBe(0);

      expect(measurement.getOffset(1)).toBe(100);

      expect(measurement.getOffset(2)).toBe(250);

      expect(measurement.getOffset(3)).toBe(350);
    });

    it("handles different sizes in the same chunk", () => {
      const measurement = createMeasurement(5, 100);

      measurement.commitSize(0, 50);

      measurement.commitSize(1, 75);

      measurement.commitSize(2, 125);

      expect(measurement.getOffset(0)).toBe(0);

      expect(measurement.getOffset(1)).toBe(50);

      expect(measurement.getOffset(2)).toBe(125);

      expect(measurement.getOffset(3)).toBe(250);

      expect(measurement.getOffset(4)).toBe(350);
    });

    it("handles offsets across chunk boundaries", () => {
      const measurement = createMeasurement(130, 10);

      expect(measurement.getOffset(63)).toBe(630);

      expect(measurement.getOffset(64)).toBe(640);

      expect(measurement.getOffset(65)).toBe(650);

      expect(measurement.getOffset(128)).toBe(1280);
    });

    it("uses Fenwick totals from previous chunks", () => {
      const measurement = createMeasurement(130, 10);

      // Last row of first chunk.
      measurement.commitSize(63, 20);

      expect(measurement.getOffset(63)).toBe(630);

      expect(measurement.getOffset(64)).toBe(650);

      expect(measurement.getOffset(65)).toBe(660);

      expect(measurement.getOffset(128)).toBe(1290);
    });

    it("prefills rows when offset requires non-materialized rows", () => {
      const measurement = createMeasurement(10, 100, 2);

      expect(measurement.getMaterializedRowCount()).toBe(2);

      expect(measurement.getOffset(5)).toBe(500);

      expect(measurement.getMaterializedRowCount()).toBe(5);
    });
  });

  describe("commitInternalSize", () => {
    it("returns previous size and difference", () => {
      const measurement = createMeasurement(5, 100);

      const result = measurement.commitSize(2, 150);

      expect(result).toEqual({
        prevSize: 100 * SIZE_SCALE,
        difference: 50 * SIZE_SCALE,
      });
    });

    it("updates stored row size", () => {
      const measurement = createMeasurement(5, 100);

      measurement.commitSize(2, 150);

      expect(measurement.getSize(2)).toBe(150);
    });

    it("updates total when row grows", () => {
      const measurement = createMeasurement(5, 100);

      measurement.commitSize(2, 150);

      expect(measurement.getTotal()).toBe(550);
    });

    it("updates total when row shrinks", () => {
      const measurement = createMeasurement(5, 100);

      measurement.commitSize(2, 50);

      expect(measurement.getTotal()).toBe(450);
    });

    it("updates Fenwick tree immediately", () => {
      const measurement = createMeasurement(130, 100);

      measurement.commitSize(64, 200);

      expect(measurement.getOffset(64)).toBe(6400);

      expect(measurement.getOffset(65)).toBe(6600);

      expect(measurement.getOffset(128)).toBe(12900);
    });
  });

  describe("findNearestIndex", () => {
    it("returns 0 for offset 0", () => {
      const measurement = createMeasurement(5, 100);

      expect(measurement.findNearestIndex(0)).toBe(0);
    });

    it("returns index at exact row boundaries", () => {
      const measurement = createMeasurement(5, 100);

      expect(measurement.findNearestIndex(100)).toBe(1);

      expect(measurement.findNearestIndex(200)).toBe(2);

      expect(measurement.findNearestIndex(400)).toBe(4);
    });

    it("returns previous row for offsets inside a row", () => {
      const measurement = createMeasurement(5, 100);

      expect(measurement.findNearestIndex(99)).toBe(0);

      expect(measurement.findNearestIndex(199)).toBe(1);

      expect(measurement.findNearestIndex(399)).toBe(3);
    });

    it("uses committed row sizes", () => {
      const measurement = createMeasurement(5, 100);

      measurement.commitSize(0, 50);

      measurement.commitSize(1, 150);

      expect(measurement.findNearestIndex(0)).toBe(0);

      expect(measurement.findNearestIndex(49)).toBe(0);

      expect(measurement.findNearestIndex(50)).toBe(1);

      expect(measurement.findNearestIndex(199)).toBe(1);

      expect(measurement.findNearestIndex(200)).toBe(2);
    });

    it("finds indexes across chunk boundaries", () => {
      const measurement = createMeasurement(130, 10);

      expect(measurement.findNearestIndex(639)).toBe(63);

      expect(measurement.findNearestIndex(640)).toBe(64);

      expect(measurement.findNearestIndex(1279)).toBe(127);

      expect(measurement.findNearestIndex(1280)).toBe(128);
    });

    it("returns materialized row count for an offset past all rows", () => {
      const measurement = createMeasurement(5, 100);

      expect(measurement.findNearestIndex(1000)).toBe(5);
    });
  });

  describe("appendRows", () => {
    it("appends rows using the provided size", () => {
      const measurement = createMeasurement(2, 100);

      measurement.append(3, 50);

      expect(measurement.getMaterializedRowCount()).toBe(5);

      expect(measurement.getSize(0)).toBe(100);

      expect(measurement.getSize(1)).toBe(100);

      expect(measurement.getSize(2)).toBe(50);

      expect(measurement.getSize(3)).toBe(50);

      expect(measurement.getSize(4)).toBe(50);
    });

    it("updates total after rows are appended", () => {
      const measurement = createMeasurement(2, 100);

      measurement.append(3, 50);

      expect(measurement.getTotal()).toBe(350);
    });

    it("fills the current chunk before creating another chunk", () => {
      const measurement = createMeasurement(63, 10);

      measurement.append(2, 20);

      expect(measurement.getMaterializedRowCount()).toBe(65);

      expect(measurement.getSize(62)).toBe(10);

      expect(measurement.getSize(63)).toBe(20);

      expect(measurement.getSize(64)).toBe(20);

      expect(measurement.getOffset(64)).toBe(650);
    });

    it("does nothing when count is zero", () => {
      const measurement = createMeasurement(5, 100);

      measurement.append(0, 200);

      expect(measurement.getMaterializedRowCount()).toBe(5);

      expect(measurement.getTotal()).toBe(500);
    });
  });

  describe("truncateRows", () => {
    it("removes all rows", () => {
      const measurement = createMeasurement(5, 100);

      const removed = measurement.truncate(0);

      expect(removed).toBe(500);

      expect(measurement.getTotal()).toBe(0);

      expect(measurement.getMaterializedRowCount()).toBe(0);
    });

    it("truncates rows inside a chunk", () => {
      const measurement = createMeasurement(10, 100);

      const removed = measurement.truncate(6);

      expect(removed).toBe(400);

      expect(measurement.getTotal()).toBe(600);

      expect(measurement.getMaterializedRowCount()).toBe(6);

      expect(measurement.getOffset(6)).toBe(600);
    });

    it("truncates exactly at a chunk boundary", () => {
      const measurement = createMeasurement(130, 10);

      const removed = measurement.truncate(64);

      expect(removed).toBe(660);

      expect(measurement.getTotal()).toBe(640);

      expect(measurement.getMaterializedRowCount()).toBe(64);
    });

    it("removes complete chunks and a partial chunk", () => {
      const measurement = createMeasurement(130, 10);

      const removed = measurement.truncate(70);

      expect(removed).toBe(600);

      expect(measurement.getTotal()).toBe(700);

      expect(measurement.getMaterializedRowCount()).toBe(70);
    });

    it("calculates removed total using actual row sizes", () => {
      const measurement = createMeasurement(10, 100);

      measurement.commitSize(7, 200);

      measurement.commitSize(8, 50);

      measurement.commitSize(9, 150);

      expect(measurement.getTotal()).toBe(1100);

      const removed = measurement.truncate(7);

      expect(removed).toBe(400);

      expect(measurement.getTotal()).toBe(700);
    });

    it("keeps Fenwick offsets valid after truncation", () => {
      const measurement = createMeasurement(130, 10);

      measurement.truncate(70);

      expect(measurement.getOffset(63)).toBe(630);

      expect(measurement.getOffset(64)).toBe(640);

      expect(measurement.getOffset(69)).toBe(690);
    });
  });

  describe("pending sizes", () => {
    it("removes pending sizes after the specified tree index", () => {
      const measurement = createMeasurement();

      measurement.setPending(1, 110);

      measurement.setPending(3, 130);

      measurement.setPending(5, 150);

      measurement.deletePendingAfter(3);

      expect(measurement.getPendingIndexes()).toEqual([1, 3]);
    });

    it("keeps pending size at the exact limit", () => {
      const measurement = createMeasurement();

      measurement.setPending(5, 150);

      measurement.deletePendingAfter(5);

      expect(measurement.getPendingIndexes()).toEqual([5]);
    });

    it("can remove all pending sizes", () => {
      const measurement = createMeasurement();

      measurement.setPending(1, 110);

      measurement.setPending(2, 120);

      measurement.deletePendingAfter(0);

      expect(measurement.getPendingIndexes()).toEqual([]);
    });
  });

  describe("version", () => {
    it("increments version", () => {
      const measurement = createMeasurement();

      expect(measurement.getVersion()).toBe(-1);

      measurement.nextTestVersion();

      expect(measurement.getVersion()).toBe(0);

      measurement.nextTestVersion();

      expect(measurement.getVersion()).toBe(1);
    });
  });

  describe("listeners", () => {
    it("notifies a subscriber", () => {
      const measurement = createMeasurement();

      const listener = vi.fn();

      measurement.subscribe(listener);

      measurement.notifyTestListeners();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies all subscribers", () => {
      const measurement = createMeasurement();

      const firstListener = vi.fn();

      const secondListener = vi.fn();

      measurement.subscribe(firstListener);

      measurement.subscribe(secondListener);

      measurement.notifyTestListeners();

      expect(firstListener).toHaveBeenCalledTimes(1);

      expect(secondListener).toHaveBeenCalledTimes(1);
    });

    it("does not notify an unsubscribed listener", () => {
      const measurement = createMeasurement();

      const listener = vi.fn();

      measurement.subscribe(listener);

      measurement.unsubscribe(listener);

      measurement.notifyTestListeners();

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not subscribe the same callback twice", () => {
      const measurement = createMeasurement();

      const listener = vi.fn();

      measurement.subscribe(listener);

      measurement.subscribe(listener);

      measurement.notifyTestListeners();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("size precision", () => {
    it("stores sizes using internal fixed-point precision", () => {
      const measurement = createMeasurement(1, 100);

      measurement.commitSize(0, 100.25);

      expect(measurement.getSize(0)).toBe(100.25);

      expect(measurement.getTotal()).toBe(100.25);
    });

    it("rounds values to 1 / SIZE_SCALE precision", () => {
      const measurement = createMeasurement(1, 100);

      measurement.commitSize(0, 100.01);

      expect(measurement.getSize(0)).toBe(
        Math.round(100.01 * SIZE_SCALE) / SIZE_SCALE,
      );
    });
  });
});
