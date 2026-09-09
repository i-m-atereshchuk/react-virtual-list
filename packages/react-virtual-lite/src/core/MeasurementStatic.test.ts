import { describe, expect, it } from "vitest";

import { MeasurementStatic } from "./MeasurementStatic";

describe("MeasurementStatic", () => {
  it("returns initial list size", () => {
    const measurement = new MeasurementStatic(10, 50);

    expect(measurement.getSize()).toBe(10);
  });

  it("returns initial total size", () => {
    const measurement = new MeasurementStatic(10, 50);

    expect(measurement.getTotal()).toBe(500);
  });

  it("starts with version 0", () => {
    const measurement = new MeasurementStatic(10, 50);

    expect(measurement.getVersion()).toBe(0);
  });

  describe("getOffset", () => {
    it("returns 0 for index 0", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(measurement.getOffset(0)).toBe(0);
    });

    it("returns offset based on row size", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(measurement.getOffset(3)).toBe(150);
    });

    it("supports fractional row size", () => {
      const measurement = new MeasurementStatic(10, 12.5);

      expect(measurement.getOffset(3)).toBeCloseTo(37.5);
    });
  });

  describe("getTotal", () => {
    it("returns list size multiplied by row size", () => {
      const measurement = new MeasurementStatic(20, 25);

      expect(measurement.getTotal()).toBe(500);
    });

    it("updates total after row size changes", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(5, 100);

      expect(measurement.getTotal()).toBe(1000);
    });
  });

  describe("findNearestIndex", () => {
    it("returns 0 for offset 0", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(measurement.findNearestIndex(0)).toBe(0);
    });

    it("returns index for exact row boundary", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(measurement.findNearestIndex(150)).toBe(3);
    });

    it("returns previous index for offset inside a row", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(measurement.findNearestIndex(149)).toBe(2);
    });

    it("uses updated row size", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(2, 100);

      expect(measurement.findNearestIndex(250)).toBe(2);
    });
  });

  describe("setRowSize", () => {
    it("updates row size", () => {
      const measurement = new MeasurementStatic(10, 50);

      const result = measurement.setRowSize(5, 100);

      expect(result).toBe(true);
      expect(measurement.getOffset(2)).toBe(200);
      expect(measurement.getTotal()).toBe(1000);
    });

    it("returns false when row size does not change", () => {
      const measurement = new MeasurementStatic(10, 50);

      const result = measurement.setRowSize(5, 50);

      expect(result).toBe(false);
      expect(measurement.getTotal()).toBe(500);
    });

    it("does not increment version for regular row size update", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(5, 100);

      expect(measurement.getVersion()).toBe(0);
    });

    it("does not increment version when row size does not change", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(5, 50);

      expect(measurement.getVersion()).toBe(0);
    });

    it("extends list size when index is greater than list size", () => {
      const measurement = new MeasurementStatic(10, 50);

      const result = measurement.setRowSize(15, 100);

      expect(result).toBe(true);
      expect(measurement.getSize()).toBe(16);
    });

    it("updates row size when list is extended", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(15, 100);

      expect(measurement.getOffset(2)).toBe(200);
      expect(measurement.getTotal()).toBe(1600);
    });

    it("increments version when list is extended", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(15, 100);

      expect(measurement.getVersion()).toBe(1);
    });

    it("increments version for every extension", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(15, 100);
      measurement.setRowSize(20, 120);

      expect(measurement.getVersion()).toBe(2);
      expect(measurement.getSize()).toBe(21);
      expect(measurement.getTotal()).toBe(2520);
    });

    it("does not extend list when index equals list size", () => {
      const measurement = new MeasurementStatic(10, 50);

      measurement.setRowSize(10, 100);

      expect(measurement.getSize()).toBe(10);
      expect(measurement.getVersion()).toBe(0);
      expect(measurement.getTotal()).toBe(1000);
    });
  });

  describe("CalculationNode methods", () => {
    it("calculate does not throw", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(() => measurement.calculate()).not.toThrow();
    });

    it("subscribe does not throw", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(() => measurement.subscribe()).not.toThrow();
    });

    it("unsubscribe does not throw", () => {
      const measurement = new MeasurementStatic(10, 50);

      expect(() => measurement.unsubscribe()).not.toThrow();
    });
  });
});
