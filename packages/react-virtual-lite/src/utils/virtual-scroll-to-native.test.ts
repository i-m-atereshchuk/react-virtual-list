import { describe, expect, it } from "vitest";

import {
  EDGE_NATIVE_FRACTION,
  EDGE_VIRTUAL_FRACTION,
} from "../constants/scroll";

import { virtualScrollToNative } from "./virtual-scroll-to-native";

describe("virtualScrollToNative", () => {
  const maxNative = 1000;
  const maxVirtual = 10_000;

  const nativeEdge = maxNative * EDGE_NATIVE_FRACTION;
  const virtualEdge = maxVirtual * EDGE_VIRTUAL_FRACTION;

  const nativeMidStart = nativeEdge;
  const nativeMidEnd = maxNative - nativeEdge;

  const virtualMidStart = virtualEdge;
  const virtualMidEnd = maxVirtual - virtualEdge;

  it("returns 0 when maxNative is 0", () => {
    expect(virtualScrollToNative(100, 0, 1000)).toBe(0);
  });

  it("returns 0 when maxNative is negative", () => {
    expect(virtualScrollToNative(100, -1, 1000)).toBe(0);
  });

  it("returns 0 when maxVirtual is 0", () => {
    expect(virtualScrollToNative(100, 1000, 0)).toBe(0);
  });

  it("returns 0 when maxVirtual is negative", () => {
    expect(virtualScrollToNative(100, 1000, -1)).toBe(0);
  });

  it("maps virtual 0 to native 0", () => {
    expect(virtualScrollToNative(0, maxNative, maxVirtual)).toBe(0);
  });

  it("maps maxVirtual to maxNative", () => {
    expect(
      virtualScrollToNative(maxVirtual, maxNative, maxVirtual),
    ).toBeCloseTo(maxNative);
  });

  describe("start edge", () => {
    it("maps virtual edge start to native edge start", () => {
      const result = virtualScrollToNative(
        virtualMidStart,
        maxNative,
        maxVirtual,
      );

      expect(result).toBeCloseTo(nativeMidStart);
    });

    it("maps values proportionally inside the start edge", () => {
      const virtual = virtualEdge / 2;

      const result = virtualScrollToNative(virtual, maxNative, maxVirtual);

      expect(result).toBeCloseTo(nativeEdge / 2);
    });
  });

  describe("middle section", () => {
    it("maps the middle point to the middle of the native range", () => {
      const virtual = maxVirtual / 2;

      const result = virtualScrollToNative(virtual, maxNative, maxVirtual);

      expect(result).toBeCloseTo(maxNative / 2);
    });

    it("maps values linearly inside the middle section", () => {
      const t = 0.25;

      const virtual = virtualMidStart + (virtualMidEnd - virtualMidStart) * t;

      const expected = nativeMidStart + (nativeMidEnd - nativeMidStart) * t;

      const result = virtualScrollToNative(virtual, maxNative, maxVirtual);

      expect(result).toBeCloseTo(expected);
    });
  });

  describe("end edge", () => {
    it("maps virtual middle end to native middle end", () => {
      const result = virtualScrollToNative(
        virtualMidEnd,
        maxNative,
        maxVirtual,
      );

      expect(result).toBeCloseTo(nativeMidEnd);
    });

    it("maps values proportionally inside the end edge", () => {
      const virtual = virtualMidEnd + virtualEdge / 2;

      const expected = nativeMidEnd + nativeEdge / 2;

      const result = virtualScrollToNative(virtual, maxNative, maxVirtual);

      expect(result).toBeCloseTo(expected);
    });
  });

  it("is continuous at the start-edge boundary", () => {
    const epsilon = 0.000001;

    const before = virtualScrollToNative(
      virtualMidStart - epsilon,
      maxNative,
      maxVirtual,
    );

    const at = virtualScrollToNative(virtualMidStart, maxNative, maxVirtual);

    const after = virtualScrollToNative(
      virtualMidStart + epsilon,
      maxNative,
      maxVirtual,
    );

    expect(before).toBeCloseTo(at, 4);
    expect(after).toBeCloseTo(at, 4);
  });

  it("is continuous at the end-edge boundary", () => {
    const epsilon = 0.000001;

    const before = virtualScrollToNative(
      virtualMidEnd - epsilon,
      maxNative,
      maxVirtual,
    );

    const at = virtualScrollToNative(virtualMidEnd, maxNative, maxVirtual);

    const after = virtualScrollToNative(
      virtualMidEnd + epsilon,
      maxNative,
      maxVirtual,
    );

    expect(before).toBeCloseTo(at, 4);
    expect(after).toBeCloseTo(at, 4);
  });

  it("produces monotonically increasing native offsets", () => {
    const virtualOffsets = [
      0,
      maxVirtual * 0.1,
      maxVirtual * 0.25,
      maxVirtual * 0.5,
      maxVirtual * 0.75,
      maxVirtual * 0.9,
      maxVirtual,
    ];

    const results = virtualOffsets.map((virtual) =>
      virtualScrollToNative(virtual, maxNative, maxVirtual),
    );

    for (let i = 1; i < results.length; i += 1) {
      expect(results[i]).toBeGreaterThanOrEqual(results[i - 1]);
    }
  });

  it("keeps result within the native range for valid virtual offsets", () => {
    const virtualOffsets = [
      0,
      maxVirtual * 0.1,
      maxVirtual * 0.25,
      maxVirtual * 0.5,
      maxVirtual * 0.75,
      maxVirtual * 0.9,
      maxVirtual,
    ];

    for (const virtual of virtualOffsets) {
      const result = virtualScrollToNative(virtual, maxNative, maxVirtual);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(maxNative);
    }
  });

  it("is the inverse of nativeScrollToVirtual for representative values", async () => {
    const { nativeScrollToVirtual } =
      await import("./native-scroll-to-virtual");

    const nativeOffsets = [
      0,
      maxNative * 0.1,
      maxNative * 0.25,
      maxNative * 0.5,
      maxNative * 0.75,
      maxNative * 0.9,
      maxNative,
    ];

    for (const native of nativeOffsets) {
      const virtual = nativeScrollToVirtual(native, maxNative, maxVirtual);

      const restoredNative = virtualScrollToNative(
        virtual,
        maxNative,
        maxVirtual,
      );

      expect(restoredNative).toBeCloseTo(native);
    }
  });
});
