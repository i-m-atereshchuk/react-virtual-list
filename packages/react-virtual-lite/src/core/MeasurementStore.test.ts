import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Measurement } from "../types/Measurement";

import { MeasurementStore } from "./MeasurementStore";

describe("MeasurementStore", () => {
  let observe: ReturnType<typeof vi.fn>;
  let unobserve: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;

  let resizeCallback: ResizeObserverCallback | undefined;

  beforeEach(() => {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    resizeCallback = undefined;

    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe = observe;

      unobserve = unobserve;

      disconnect = disconnect;
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createMeasurement = (): Measurement => {
    return {
      setRowSize: vi.fn(),
      getSize: vi.fn(),
      getOffset: vi.fn(),
      getTotal: vi.fn(),
      findNearestIndex: vi.fn(),
      getVersion: vi.fn(),
      updateListSize: vi.fn(),
    };
  };

  const getResizeCallback = (): ResizeObserverCallback => {
    if (!resizeCallback) {
      throw new Error("ResizeObserver was not created");
    }

    return resizeCallback;
  };

  const createResizeObserverEntry = (
    target: Element,
    width: number,
    height: number,
  ): ResizeObserverEntry => {
    return {
      target,
      contentRect: {
        x: 0,
        y: 0,
        top: 0,
        right: width,
        bottom: height,
        left: 0,
        width,
        height,
        toJSON: () => ({}),
      },
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    };
  };

  const emitResize = (
    target: Element,
    size: {
      width?: number;
      height?: number;
    },
  ) => {
    getResizeCallback()(
      [createResizeObserverEntry(target, size.width ?? 0, size.height ?? 0)],
      {} as ResizeObserver,
    );
  };

  describe("dynamic row size", () => {
    it("creates ResizeObserver when rowSize is not provided", () => {
      const measurement = createMeasurement();

      new MeasurementStore(measurement, "vertical");

      expect(resizeCallback).toBeTypeOf("function");
    });

    it("observes a row", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const row = document.createElement("div");

      store.observeRow(row, 2);

      expect(observe).toHaveBeenCalledTimes(1);
      expect(observe).toHaveBeenCalledWith(row);
    });

    it("sets vertical row size from contentRect height", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const row = document.createElement("div");

      store.observeRow(row, 2);

      emitResize(row, {
        width: 300,
        height: 120,
      });

      expect(measurement.setRowSize).toHaveBeenCalledTimes(1);

      expect(measurement.setRowSize).toHaveBeenCalledWith(2, 120);
    });

    it("sets horizontal row size from contentRect width", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "horizontal");

      const row = document.createElement("div");

      store.observeRow(row, 3);

      emitResize(row, {
        width: 250,
        height: 100,
      });

      expect(measurement.setRowSize).toHaveBeenCalledTimes(1);

      expect(measurement.setRowSize).toHaveBeenCalledWith(3, 250);
    });

    it("uses the index associated with each row", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const firstRow = document.createElement("div");
      const secondRow = document.createElement("div");

      store.observeRow(firstRow, 1);
      store.observeRow(secondRow, 5);

      emitResize(firstRow, {
        height: 100,
      });

      emitResize(secondRow, {
        height: 200,
      });

      expect(measurement.setRowSize).toHaveBeenNthCalledWith(1, 1, 100);

      expect(measurement.setRowSize).toHaveBeenNthCalledWith(2, 5, 200);
    });

    it("ignores resize entries for unknown rows", () => {
      const measurement = createMeasurement();

      new MeasurementStore(measurement, "vertical");

      const row = document.createElement("div");

      emitResize(row, {
        height: 100,
      });

      expect(measurement.setRowSize).not.toHaveBeenCalled();
    });

    it("handles multiple entries in one ResizeObserver callback", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const firstRow = document.createElement("div");
      const secondRow = document.createElement("div");

      store.observeRow(firstRow, 1);
      store.observeRow(secondRow, 2);

      getResizeCallback()(
        [
          createResizeObserverEntry(firstRow, 50, 100),
          createResizeObserverEntry(secondRow, 60, 200),
        ],
        {} as ResizeObserver,
      );

      expect(measurement.setRowSize).toHaveBeenCalledTimes(2);

      expect(measurement.setRowSize).toHaveBeenNthCalledWith(1, 1, 100);

      expect(measurement.setRowSize).toHaveBeenNthCalledWith(2, 2, 200);
    });

    it("updates the index when the same row is observed again", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const row = document.createElement("div");

      store.observeRow(row, 1);
      store.observeRow(row, 5);

      emitResize(row, {
        height: 100,
      });

      expect(measurement.setRowSize).toHaveBeenCalledWith(5, 100);
    });

    it("unobserves row when cleanup is called", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const row = document.createElement("div");

      const cleanup = store.observeRow(row, 2);

      cleanup();

      expect(unobserve).toHaveBeenCalledTimes(1);
      expect(unobserve).toHaveBeenCalledWith(row);
    });

    it("removes row mapping when cleanup is called", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const row = document.createElement("div");

      const cleanup = store.observeRow(row, 2);

      cleanup();

      emitResize(row, {
        height: 100,
      });

      expect(measurement.setRowSize).not.toHaveBeenCalled();
    });
  });

  describe("static row size", () => {
    it("does not create ResizeObserver when rowSize is provided", () => {
      const measurement = createMeasurement();

      new MeasurementStore(measurement, "vertical", 100);

      expect(resizeCallback).toBeUndefined();
    });

    it("sets provided row size when row is observed", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical", 100);

      const row = document.createElement("div");

      store.observeRow(row, 3);

      expect(measurement.setRowSize).toHaveBeenCalledTimes(1);

      expect(measurement.setRowSize).toHaveBeenCalledWith(3, 100);
    });

    it("supports zero as a static row size", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical", 0);

      const row = document.createElement("div");

      store.observeRow(row, 3);

      expect(measurement.setRowSize).toHaveBeenCalledWith(3, 0);

      expect(resizeCallback).toBeUndefined();
    });

    it("does not observe element when static row size is provided", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical", 100);

      const row = document.createElement("div");

      store.observeRow(row, 3);

      expect(observe).not.toHaveBeenCalled();
    });

    it("returns a no-op cleanup function", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical", 100);

      const row = document.createElement("div");

      const cleanup = store.observeRow(row, 3);

      expect(() => cleanup()).not.toThrow();

      expect(unobserve).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("disconnects ResizeObserver", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      store.disconnect();

      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it("clears row mappings", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical");

      const row = document.createElement("div");

      store.observeRow(row, 4);

      store.disconnect();

      emitResize(row, {
        height: 120,
      });

      expect(measurement.setRowSize).not.toHaveBeenCalled();
    });

    it("does not throw when static row size is used", () => {
      const measurement = createMeasurement();

      const store = new MeasurementStore(measurement, "vertical", 100);

      expect(() => store.disconnect()).not.toThrow();

      expect(disconnect).not.toHaveBeenCalled();
    });
  });
});
