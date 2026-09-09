import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VirtualListRef } from "../types/List";
import type { CalculateRenderRange } from "../core/CalculateRenderRange";

import { scrollToOffset } from "../utils/scroll-to-offset";

import { useVirtualListHandle } from "./use-virtual-list-handle";

vi.mock("../utils/scroll-to-offset", () => ({
  scrollToOffset: vi.fn(),
}));

describe("useVirtualListHandle", () => {
  let animationFrameId = 0;
  let animationFrameCallbacks: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    animationFrameId = 0;
    animationFrameCallbacks = new Map();

    vi.mocked(scrollToOffset).mockClear();

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        animationFrameId += 1;

        animationFrameCallbacks.set(animationFrameId, callback);

        return animationFrameId;
      }),
    );

    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: number) => {
        animationFrameCallbacks.delete(id);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const flushAnimationFrame = async () => {
    await Promise.resolve();

    const entry = animationFrameCallbacks.entries().next();

    if (entry.done) {
      return false;
    }

    const [id, callback] = entry.value;

    animationFrameCallbacks.delete(id);

    await act(async () => {
      callback(performance.now());
      await Promise.resolve();
    });

    return true;
  };

  const flushAnimationFrameWithoutMicrotasks = () => {
    const entry = animationFrameCallbacks.entries().next();

    if (entry.done) {
      return false;
    }

    const [id, callback] = entry.value;

    animationFrameCallbacks.delete(id);

    callback(performance.now());

    return true;
  };

  const flushUntilResolved = async (
    promise: Promise<unknown>,
    maxFrames = 100,
  ) => {
    let settled = false;
    let rejection: unknown;

    promise.then(
      () => {
        settled = true;
      },
      (error) => {
        rejection = error;
        settled = true;
      },
    );

    for (let i = 0; i < maxFrames && !settled; i += 1) {
      await flushAnimationFrame();
      await Promise.resolve();
    }

    if (!settled) {
      throw new Error(
        `Promise did not resolve after ${maxFrames} animation frames`,
      );
    }

    if (rejection) {
      throw rejection;
    }

    await promise;
  };

  const createCalculateRenderRange = (
    overrides: Partial<CalculateRenderRange> = {},
  ) => {
    const listeners = new Set<() => void>();

    return {
      getVisibleStartIndex: vi.fn(() => 0),

      getVisibleEndIndex: vi.fn(() => 9),

      getMeasurementVersion: vi.fn(() => 0),

      getScrollOffsetByIndex: vi.fn((index: number) => index * 100),

      getIndexByOffset: vi.fn((offset: number) => Math.floor(offset / 100)),

      getNativeScrollOffset: vi.fn((offset: number) => offset),

      subscribe: vi.fn((listener: () => void) => {
        listeners.add(listener);
      }),

      unsubscribe: vi.fn((listener: () => void) => {
        listeners.delete(listener);
      }),

      emitChange: () => {
        listeners.forEach((listener) => listener());
      },

      ...overrides,
    } as unknown as CalculateRenderRange & {
      emitChange(): void;
    };
  };

  const setup = ({
    orientation = "vertical",
    listSize = 100,
    totalSize = 10_000,
    calculateRenderRange = createCalculateRenderRange(),
  }: {
    orientation?: "vertical" | "horizontal";
    listSize?: number;
    totalSize?: number;
    calculateRenderRange?: ReturnType<typeof createCalculateRenderRange>;
  } = {}) => {
    const ref = createRef<VirtualListRef | null>();

    const container = document.createElement("div");

    const containerRef: { current: HTMLDivElement | null } = {
      current: container,
    };

    renderHook(() =>
      useVirtualListHandle({
        ref,
        containerRef,
        orientation,
        listSize,
        totalSize,
        calculateRenderRange,
      }),
    );

    return {
      ref,
      container,
      containerRef,
      calculateRenderRange,
    };
  };

  describe("scrollToIndex", () => {
    it("throws when index is negative", async () => {
      const { ref } = setup({
        listSize: 10,
      });

      await expect(ref.current!.scrollToIndex(-1)).rejects.toThrow(
        "Index is out of range [0, 9]",
      );

      expect(scrollToOffset).not.toHaveBeenCalled();
    });

    it("throws when index is equal to list size", async () => {
      const { ref } = setup({
        listSize: 10,
      });

      await expect(ref.current!.scrollToIndex(10)).rejects.toThrow(
        "Index is out of range [0, 9]",
      );

      expect(scrollToOffset).not.toHaveBeenCalled();
    });

    it("scrolls to the calculated offset", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 5),

        getVisibleEndIndex: vi.fn(() => 5),

        getScrollOffsetByIndex: vi.fn(() => 500),
      });

      const { ref, container } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToIndex(5);

      expect(calculateRenderRange.getScrollOffsetByIndex).toHaveBeenCalledWith(
        5,
      );

      expect(scrollToOffset).toHaveBeenCalledWith(
        container,
        500,
        0,
        "vertical",
      );

      await flushUntilResolved(promise);

      expect(calculateRenderRange.unsubscribe).toHaveBeenCalled();
    });

    it("uses horizontal orientation", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 2),

        getVisibleEndIndex: vi.fn(() => 2),

        getScrollOffsetByIndex: vi.fn(() => 250),
      });

      const { ref, container } = setup({
        orientation: "horizontal",
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToIndex(2);

      expect(scrollToOffset).toHaveBeenCalledWith(
        container,
        250,
        0,
        "horizontal",
      );

      await flushUntilResolved(promise);
    });

    it("retries while target index is not visible", async () => {
      let visible = false;

      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => (visible ? 20 : 0)),

        getVisibleEndIndex: vi.fn(() => (visible ? 20 : 10)),

        getScrollOffsetByIndex: vi.fn(() => 2000),
      });

      const { ref } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToIndex(20);

      expect(scrollToOffset).toHaveBeenCalledTimes(1);

      await flushAnimationFrame();

      expect(scrollToOffset).toHaveBeenCalledTimes(2);

      visible = true;

      await flushUntilResolved(promise);
    });

    it("recalculates offset when measurement version changes", async () => {
      let measurementVersion = 0;
      let offset = 100;

      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 1),

        getVisibleEndIndex: vi.fn(() => 1),

        getMeasurementVersion: vi.fn(() => measurementVersion),

        getScrollOffsetByIndex: vi.fn(() => offset),
      });

      const { ref, container } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToIndex(1);

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        100,
        0,
        "vertical",
      );

      measurementVersion = 1;
      offset = 140;

      await flushAnimationFrame();

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        140,
        0,
        "vertical",
      );

      await flushUntilResolved(promise);
    });

    it("reacts to CalculateRenderRange changes", async () => {
      let offset = 100;

      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 1),

        getVisibleEndIndex: vi.fn(() => 1),

        getScrollOffsetByIndex: vi.fn(() => offset),
      });

      const { ref, container } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToIndex(1);

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        100,
        0,
        "vertical",
      );

      offset = 150;

      act(() => {
        calculateRenderRange.emitChange();
      });

      await flushAnimationFrame();

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        150,
        0,
        "vertical",
      );

      await flushUntilResolved(promise);
    });

    it("cancels previous operation when a new scroll starts", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 0),

        getVisibleEndIndex: vi.fn(() => 100),

        getScrollOffsetByIndex: vi.fn((index: number) => index * 100),
      });

      const { ref } = setup({
        calculateRenderRange,
      });

      const firstPromise = ref.current!.scrollToIndex(1);

      const secondPromise = ref.current!.scrollToIndex(2);

      await flushUntilResolved(firstPromise);
      await flushUntilResolved(secondPromise);

      expect(calculateRenderRange.getScrollOffsetByIndex).toHaveBeenCalledWith(
        1,
      );

      expect(calculateRenderRange.getScrollOffsetByIndex).toHaveBeenCalledWith(
        2,
      );

      expect(calculateRenderRange.unsubscribe).toHaveBeenCalled();
    });

    it("completes when container does not exist", async () => {
      const calculateRenderRange = createCalculateRenderRange();

      const ref = createRef<VirtualListRef>();

      const containerRef = {
        current: null,
      };

      renderHook(() =>
        useVirtualListHandle({
          ref,
          containerRef,
          orientation: "vertical",
          listSize: 100,
          totalSize: 10_000,
          calculateRenderRange,
        }),
      );

      await expect(ref.current!.scrollToIndex(5)).resolves.toBeUndefined();

      expect(scrollToOffset).not.toHaveBeenCalled();

      expect(calculateRenderRange.unsubscribe).toHaveBeenCalled();
    });

    it("unsubscribes after completion", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 1),

        getVisibleEndIndex: vi.fn(() => 1),
      });

      const { ref } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToIndex(1);

      await flushUntilResolved(promise);

      expect(calculateRenderRange.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("scrollToOffset", () => {
    it("throws when offset is negative", async () => {
      const { ref } = setup({
        totalSize: 1000,
      });

      await expect(ref.current!.scrollToOffset(-1)).rejects.toThrow(
        "Offset is out of range [0, 1000]",
      );

      expect(scrollToOffset).not.toHaveBeenCalled();
    });

    it("throws when offset is greater than total size", async () => {
      const { ref } = setup({
        totalSize: 1000,
      });

      await expect(ref.current!.scrollToOffset(1001)).rejects.toThrow(
        "Offset is out of range [0, 1000]",
      );

      expect(scrollToOffset).not.toHaveBeenCalled();
    });

    it("accepts zero offset", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 0),

        getVisibleEndIndex: vi.fn(() => 0),

        getIndexByOffset: vi.fn(() => 0),

        getScrollOffsetByIndex: vi.fn(() => 0),

        getNativeScrollOffset: vi.fn(() => 0),
      });

      const { ref, container } = setup({
        totalSize: 1000,
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToOffset(0);

      await flushUntilResolved(promise);

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        0,
        0,
        "vertical",
      );
    });

    it("accepts offset equal to total size", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 10),

        getVisibleEndIndex: vi.fn(() => 10),

        getIndexByOffset: vi.fn(() => 10),

        getScrollOffsetByIndex: vi.fn(() => 1000),

        getNativeScrollOffset: vi.fn(() => 1000),
      });

      const { ref } = setup({
        totalSize: 1000,
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToOffset(1000);

      await flushUntilResolved(promise);

      expect(calculateRenderRange.getNativeScrollOffset).toHaveBeenCalledWith(
        1000,
      );
    });

    it("scrolls to the final native offset", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 5),

        getVisibleEndIndex: vi.fn(() => 5),

        getIndexByOffset: vi.fn(() => 5),

        getScrollOffsetByIndex: vi.fn(() => 500),

        getNativeScrollOffset: vi.fn(() => 475),
      });

      const { ref, container } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToOffset(500);

      await flushUntilResolved(promise);

      expect(calculateRenderRange.getIndexByOffset).toHaveBeenCalledWith(500);

      expect(calculateRenderRange.getNativeScrollOffset).toHaveBeenCalledWith(
        500,
      );

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        475,
        0,
        "vertical",
      );
    });

    it("uses horizontal orientation for final native offset", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 3),

        getVisibleEndIndex: vi.fn(() => 3),

        getIndexByOffset: vi.fn(() => 3),

        getScrollOffsetByIndex: vi.fn(() => 300),

        getNativeScrollOffset: vi.fn(() => 280),
      });

      const { ref, container } = setup({
        orientation: "horizontal",
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToOffset(300);

      await flushUntilResolved(promise);

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        280,
        0,
        "horizontal",
      );
    });

    it("restarts when offset maps to a different index", async () => {
      let getIndexCall = 0;

      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 5),

        getVisibleEndIndex: vi.fn(() => 6),

        getIndexByOffset: vi.fn(() => {
          getIndexCall += 1;

          if (getIndexCall === 1) {
            return 5;
          }

          return 6;
        }),

        getScrollOffsetByIndex: vi.fn((index: number) => index * 100),

        getNativeScrollOffset: vi.fn(() => 550),
      });

      const { ref, container } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToOffset(550);

      await flushUntilResolved(promise);

      expect(calculateRenderRange.getScrollOffsetByIndex).toHaveBeenCalledWith(
        5,
      );

      expect(calculateRenderRange.getScrollOffsetByIndex).toHaveBeenCalledWith(
        6,
      );

      expect(calculateRenderRange.getNativeScrollOffset).toHaveBeenCalledWith(
        550,
      );

      expect(scrollToOffset).toHaveBeenLastCalledWith(
        container,
        550,
        0,
        "vertical",
      );
    });

    it("does not perform final native scroll when container disappears", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 5),

        getVisibleEndIndex: vi.fn(() => 5),

        getIndexByOffset: vi.fn(() => 5),

        getScrollOffsetByIndex: vi.fn(() => 500),

        getNativeScrollOffset: vi.fn(() => 475),
      });

      const { ref, containerRef } = setup({
        calculateRenderRange,
      });

      const promise = ref.current!.scrollToOffset(500);

      // 10 correction passes.
      for (let i = 0; i < 10; i += 1) {
        await flushAnimationFrame();
      }

      // Final check resolves scrollToOffsetByIndex, but deliberately
      // does not flush the promise continuation.
      const flushed = flushAnimationFrameWithoutMicrotasks();

      expect(flushed).toBe(true);

      containerRef.current = null;

      await Promise.resolve();

      await flushUntilResolved(promise);

      expect(calculateRenderRange.getNativeScrollOffset).not.toHaveBeenCalled();
    });

    it("cancels previous scrollToOffset when another operation starts", async () => {
      const calculateRenderRange = createCalculateRenderRange({
        getVisibleStartIndex: vi.fn(() => 0),

        getVisibleEndIndex: vi.fn(() => 100),

        getIndexByOffset: vi.fn((offset: number) => Math.floor(offset / 100)),

        getScrollOffsetByIndex: vi.fn((index: number) => index * 100),

        getNativeScrollOffset: vi.fn((offset: number) => offset),
      });

      const { ref } = setup({
        calculateRenderRange,
      });

      const firstPromise = ref.current!.scrollToOffset(100);

      const secondPromise = ref.current!.scrollToOffset(200);

      await flushUntilResolved(firstPromise);
      await flushUntilResolved(secondPromise);

      expect(calculateRenderRange.getScrollOffsetByIndex).toHaveBeenCalledWith(
        1,
      );

      expect(calculateRenderRange.getScrollOffsetByIndex).toHaveBeenCalledWith(
        2,
      );
    });
  });
});
