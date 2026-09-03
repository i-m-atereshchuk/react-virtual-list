import { describe, expect, it } from "vitest";

import {
  EDGE_NATIVE_FRACTION,
  EDGE_VIRTUAL_FRACTION,
} from "../constants/scroll";

import { nativeScrollToVirtual } from "./native-scroll-to-virtual";

describe("nativeScrollToVirtual", () => {
  const maxNative = 1000;
  const maxVirtual = 10_000;

  const nativeEdge = maxNative * EDGE_NATIVE_FRACTION;
  const virtualEdge = maxVirtual * EDGE_VIRTUAL_FRACTION;

  const nativeMidEnd = maxNative - nativeEdge;
  const virtualMidEnd = maxVirtual - virtualEdge;

  it("returns 0 when maxNative is 0", () => {
    expect(nativeScrollToVirtual(100, 0, 1000)).toBe(0);
  });

  it("returns 0 when maxNative is negative", () => {
    expect(nativeScrollToVirtual(100, -1, 1000)).toBe(0);
  });

  it("returns 0 when maxVirtual is 0", () => {
    expect(nativeScrollToVirtual(100, 1000, 0)).toBe(0);
  });

  it("returns 0 when maxVirtual is negative", () => {
    expect(nativeScrollToVirtual(100, 1000, -1)).toBe(0);
  });

  it("maps native 0 to virtual 0", () => {
    expect(nativeScrollToVirtual(0, maxNative, maxVirtual)).toBe(0);
  });

  it("maps maxNative to maxVirtual", () => {
    expect(nativeScrollToVirtual(maxNative, maxNative, maxVirtual)).toBeCloseTo(
      maxVirtual,
    );
  });

  describe("start edge", () => {
    it("maps native edge start to virtual edge start", () => {
      const result = nativeScrollToVirtual(nativeEdge, maxNative, maxVirtual);

      expect(result).toBeCloseTo(virtualEdge);
    });

    it("maps values proportionally inside the start edge", () => {
      const native = nativeEdge / 2;

      const result = nativeScrollToVirtual(native, maxNative, maxVirtual);

      expect(result).toBeCloseTo(virtualEdge / 2);
    });
  });

  describe("middle section", () => {
    it("maps the middle point to the middle of the virtual range", () => {
      const native = maxNative / 2;

      const result = nativeScrollToVirtual(native, maxNative, maxVirtual);

      expect(result).toBeCloseTo(maxVirtual / 2);
    });

    it("maps values linearly inside the middle section", () => {
      const nativeMidStart = nativeEdge;
      const nativeMidEnd = maxNative - nativeEdge;

      const virtualMidStart = virtualEdge;
      const virtualMidEnd = maxVirtual - virtualEdge;

      const t = 0.25;

      const native = nativeMidStart + (nativeMidEnd - nativeMidStart) * t;

      const expected = virtualMidStart + (virtualMidEnd - virtualMidStart) * t;

      expect(nativeScrollToVirtual(native, maxNative, maxVirtual)).toBeCloseTo(
        expected,
      );
    });
  });

  describe("end edge", () => {
    it("maps native middle end to virtual middle end", () => {
      const result = nativeScrollToVirtual(nativeMidEnd, maxNative, maxVirtual);

      expect(result).toBeCloseTo(virtualMidEnd);
    });

    it("maps values proportionally inside the end edge", () => {
      const native = nativeMidEnd + nativeEdge / 2;

      const expected = virtualMidEnd + virtualEdge / 2;

      const result = nativeScrollToVirtual(native, maxNative, maxVirtual);

      expect(result).toBeCloseTo(expected);
    });
  });

  it("is continuous at the start-edge boundary", () => {
    const epsilon = 0.000001;

    const before = nativeScrollToVirtual(
      nativeEdge - epsilon,
      maxNative,
      maxVirtual,
    );

    const at = nativeScrollToVirtual(nativeEdge, maxNative, maxVirtual);

    const after = nativeScrollToVirtual(
      nativeEdge + epsilon,
      maxNative,
      maxVirtual,
    );

    expect(before).toBeCloseTo(at, 4);
    expect(after).toBeCloseTo(at, 4);
  });

  it("is continuous at the end-edge boundary", () => {
    const epsilon = 0.000001;

    const before = nativeScrollToVirtual(
      nativeMidEnd - epsilon,
      maxNative,
      maxVirtual,
    );

    const at = nativeScrollToVirtual(nativeMidEnd, maxNative, maxVirtual);

    const after = nativeScrollToVirtual(
      nativeMidEnd + epsilon,
      maxNative,
      maxVirtual,
    );

    expect(before).toBeCloseTo(at, 4);
    expect(after).toBeCloseTo(at, 4);
  });

  it("produces monotonically increasing virtual offsets", () => {
    const nativeOffsets = [
      0,
      maxNative * 0.1,
      maxNative * 0.25,
      maxNative * 0.5,
      maxNative * 0.75,
      maxNative * 0.9,
      maxNative,
    ];

    const results = nativeOffsets.map((native) =>
      nativeScrollToVirtual(native, maxNative, maxVirtual),
    );

    for (let i = 1; i < results.length; i += 1) {
      expect(results[i]).toBeGreaterThanOrEqual(results[i - 1]);
    }
  });

  it("keeps result within the virtual range for valid native offsets", () => {
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
      const result = nativeScrollToVirtual(native, maxNative, maxVirtual);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(maxVirtual);
    }
  });
});
