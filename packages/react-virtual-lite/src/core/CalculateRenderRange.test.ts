import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_SAFE_SCROLL_RANGE } from "../constants/scroll";

import type { Measurement } from "../types/Measurement";

import { nativeScrollToVirtual } from "../utils/native-scroll-to-virtual";
import { virtualScrollToNative } from "../utils/virtual-scroll-to-native";

import { CalculateRenderRange } from "./CalculateRenderRange";

vi.mock("../utils/native-scroll-to-virtual", () => ({
  nativeScrollToVirtual: vi.fn(),
}));

vi.mock("../utils/virtual-scroll-to-native", () => ({
  virtualScrollToNative: vi.fn(),
}));

describe("CalculateRenderRange", () => {
  const createMeasurement = ({
    version = 0,
    total = 1000,
    rowSize = 100,
  }: {
    version?: number;
    total?: number;
    rowSize?: number;
  } = {}): Measurement => {
    return {
      setRowSize: vi.fn(),
      getSize: vi.fn(() => rowSize),
      getOffset: vi.fn((index: number) => index * rowSize),
      getTotal: vi.fn(() => total),
      findNearestIndex: vi.fn((offset: number) => Math.floor(offset / rowSize)),
      getVersion: vi.fn(() => version),
    };
  };

  const createCalculateRenderRange = ({
    measurement = createMeasurement(),
    viewPortSize = 200,
    overscan = 1,
    listSize = 10,
    remainingItemsThreshold = 1,
    onReachEnd,
    onReachStart,
    onVisibleRangeChange,
  }: {
    measurement?: Measurement;
    viewPortSize?: number;
    overscan?: number;
    listSize?: number;
    remainingItemsThreshold?: number;
    onReachEnd?: () => void;
    onReachStart?: () => void;
    onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
  } = {}) => {
    return new CalculateRenderRange({
      measurement,
      viewPortSize,
      overscan,
      listSize,
      remainingItemsThreshold,
      onReachEnd,
      onReachStart,
      onVisibleRangeChange,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(nativeScrollToVirtual).mockImplementation((native) => native);

    vi.mocked(virtualScrollToNative).mockImplementation((virtual) => virtual);
  });

  describe("initial calculation", () => {
    it("calculates the initial visible range", () => {
      const calculateRenderRange = createCalculateRenderRange();

      expect(calculateRenderRange.getVisibleStartIndex()).toBe(0);

      expect(calculateRenderRange.getVisibleEndIndex()).toBe(2);
    });

    it("calculates the initial render range with overscan", () => {
      const calculateRenderRange = createCalculateRenderRange();

      expect(calculateRenderRange.getStartIndex()).toBe(0);

      expect(calculateRenderRange.getEndIndex()).toBe(4);
    });

    it("limits start index to zero", () => {
      const calculateRenderRange = createCalculateRenderRange({
        overscan: 10,
      });

      expect(calculateRenderRange.getStartIndex()).toBe(0);
    });

    it("limits end index to list size", () => {
      const calculateRenderRange = createCalculateRenderRange({
        listSize: 3,
        overscan: 10,
      });

      expect(calculateRenderRange.getEndIndex()).toBe(3);
    });

    it("uses total size as safe range when scrolling is not compressed", () => {
      const measurement = createMeasurement({
        total: 1000,
      });

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      expect(calculateRenderRange.getSafeRange()).toBe(1000);
    });
  });

  describe("handleScroll", () => {
    it("notifies subscribers when scroll changes are queued", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const listener = vi.fn();

      calculateRenderRange.subscribe(listener);

      calculateRenderRange.handleScroll(300);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not update calculated range until calculate is called", () => {
      const calculateRenderRange = createCalculateRenderRange();

      calculateRenderRange.handleScroll(300);

      expect(calculateRenderRange.getVisibleStartIndex()).toBe(0);

      calculateRenderRange.calculate();

      expect(calculateRenderRange.getVisibleStartIndex()).toBe(3);
    });

    it("updates visible range after scrolling", () => {
      const calculateRenderRange = createCalculateRenderRange();

      calculateRenderRange.handleScroll(300);
      calculateRenderRange.calculate();

      expect(calculateRenderRange.getVisibleStartIndex()).toBe(3);

      expect(calculateRenderRange.getVisibleEndIndex()).toBe(5);
    });

    it("updates render range after scrolling", () => {
      const calculateRenderRange = createCalculateRenderRange();

      calculateRenderRange.handleScroll(300);
      calculateRenderRange.calculate();

      expect(calculateRenderRange.getStartIndex()).toBe(2);

      expect(calculateRenderRange.getEndIndex()).toBe(7);
    });

    it("does not recalculate when nothing changed", () => {
      const measurement = createMeasurement();

      createCalculateRenderRange({
        measurement,
      });

      vi.mocked(measurement.findNearestIndex).mockClear();

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      vi.mocked(measurement.findNearestIndex).mockClear();

      calculateRenderRange.calculate();

      expect(measurement.findNearestIndex).not.toHaveBeenCalled();
    });
  });

  describe("measurement changes", () => {
    it("recalculates when measurement version changes", () => {
      let version = 0;

      const measurement = createMeasurement();

      vi.mocked(measurement.getVersion).mockImplementation(() => version);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      vi.mocked(measurement.findNearestIndex).mockClear();

      version = 1;

      calculateRenderRange.calculate();

      expect(measurement.findNearestIndex).toHaveBeenCalledTimes(2);
    });

    it("returns the current measurement version", () => {
      let version = 3;

      const measurement = createMeasurement();

      vi.mocked(measurement.getVersion).mockImplementation(() => version);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      expect(calculateRenderRange.getMeasurementVersion()).toBe(3);

      version = 4;

      expect(calculateRenderRange.getMeasurementVersion()).toBe(4);
    });
  });

  describe("visible range callback", () => {
    it("calls onVisibleRangeChange during initial calculation", () => {
      const onVisibleRangeChange = vi.fn();

      createCalculateRenderRange({
        onVisibleRangeChange,
      });

      expect(onVisibleRangeChange).toHaveBeenCalledTimes(1);

      expect(onVisibleRangeChange).toHaveBeenCalledWith(0, 2);
    });

    it("calls onVisibleRangeChange when visible range changes", () => {
      const onVisibleRangeChange = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        onVisibleRangeChange,
      });

      onVisibleRangeChange.mockClear();

      calculateRenderRange.handleScroll(300);
      calculateRenderRange.calculate();

      expect(onVisibleRangeChange).toHaveBeenCalledTimes(1);

      expect(onVisibleRangeChange).toHaveBeenCalledWith(3, 5);
    });

    it("does not call onVisibleRangeChange when visible range does not change", () => {
      const onVisibleRangeChange = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        onVisibleRangeChange,
      });

      onVisibleRangeChange.mockClear();

      calculateRenderRange.handleScroll(20);
      calculateRenderRange.calculate();

      expect(onVisibleRangeChange).not.toHaveBeenCalled();
    });
  });

  describe("reach callbacks", () => {
    it("calls onReachEnd when scrolling toward the end and threshold is reached", () => {
      const onReachEnd = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        listSize: 10,
        viewPortSize: 200,
        remainingItemsThreshold: 2,
        onReachEnd,
      });

      onReachEnd.mockClear();

      calculateRenderRange.handleScroll(600);
      calculateRenderRange.calculate();

      expect(onReachEnd).toHaveBeenCalledTimes(1);
    });

    it("does not call onReachEnd when threshold is not reached", () => {
      const onReachEnd = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        listSize: 10,
        viewPortSize: 200,
        remainingItemsThreshold: 1,
        onReachEnd,
      });

      onReachEnd.mockClear();

      calculateRenderRange.handleScroll(300);
      calculateRenderRange.calculate();

      expect(onReachEnd).not.toHaveBeenCalled();
    });

    it("does not call onReachEnd when scrolling backward", () => {
      const onReachEnd = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        listSize: 10,
        remainingItemsThreshold: 10,
        onReachEnd,
      });

      onReachEnd.mockClear();

      calculateRenderRange.handleScroll(500);
      calculateRenderRange.calculate();

      onReachEnd.mockClear();

      calculateRenderRange.handleScroll(400);
      calculateRenderRange.calculate();

      expect(onReachEnd).not.toHaveBeenCalled();
    });

    it("calls onReachStart when scrolling backward and threshold is reached", () => {
      const onReachStart = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        remainingItemsThreshold: 1,
        onReachStart,
      });

      calculateRenderRange.handleScroll(500);
      calculateRenderRange.calculate();

      onReachStart.mockClear();

      calculateRenderRange.handleScroll(100);
      calculateRenderRange.calculate();

      expect(onReachStart).toHaveBeenCalledTimes(1);
    });

    it("does not call onReachStart when scrolling forward", () => {
      const onReachStart = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        remainingItemsThreshold: 10,
        onReachStart,
      });

      onReachStart.mockClear();

      calculateRenderRange.handleScroll(100);
      calculateRenderRange.calculate();

      expect(onReachStart).not.toHaveBeenCalled();
    });
  });

  describe("subscriptions", () => {
    it("notifies all subscribers", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const firstListener = vi.fn();
      const secondListener = vi.fn();

      calculateRenderRange.subscribe(firstListener);
      calculateRenderRange.subscribe(secondListener);

      calculateRenderRange.handleScroll(100);

      expect(firstListener).toHaveBeenCalledTimes(1);
      expect(secondListener).toHaveBeenCalledTimes(1);
    });

    it("does not notify an unsubscribed listener", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const listener = vi.fn();

      calculateRenderRange.subscribe(listener);
      calculateRenderRange.unsubscribe(listener);

      calculateRenderRange.handleScroll(100);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("uppdateProperties", () => {
    it("notifies when viewport size changes", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const listener = vi.fn();

      calculateRenderRange.subscribe(listener);

      calculateRenderRange.uppdateProperties({
        viewPortSize: 300,
        overscan: 1,
        listSize: 10,
        remainingItemsThreshold: 1,
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies when overscan changes", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const listener = vi.fn();

      calculateRenderRange.subscribe(listener);

      calculateRenderRange.uppdateProperties({
        viewPortSize: 200,
        overscan: 2,
        listSize: 10,
        remainingItemsThreshold: 1,
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies when list size changes", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const listener = vi.fn();

      calculateRenderRange.subscribe(listener);

      calculateRenderRange.uppdateProperties({
        viewPortSize: 200,
        overscan: 1,
        listSize: 20,
        remainingItemsThreshold: 1,
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not notify when only remainingItemsThreshold changes", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const listener = vi.fn();

      calculateRenderRange.subscribe(listener);

      calculateRenderRange.uppdateProperties({
        viewPortSize: 200,
        overscan: 1,
        listSize: 10,
        remainingItemsThreshold: 5,
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not notify when properties are unchanged", () => {
      const calculateRenderRange = createCalculateRenderRange();

      const listener = vi.fn();

      calculateRenderRange.subscribe(listener);

      calculateRenderRange.uppdateProperties({
        viewPortSize: 200,
        overscan: 1,
        listSize: 10,
        remainingItemsThreshold: 1,
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("recalculates after layout properties change", () => {
      const calculateRenderRange = createCalculateRenderRange();

      calculateRenderRange.uppdateProperties({
        viewPortSize: 300,
        overscan: 2,
        listSize: 10,
        remainingItemsThreshold: 1,
      });

      calculateRenderRange.calculate();

      expect(calculateRenderRange.getVisibleEndIndex()).toBe(3);

      expect(calculateRenderRange.getEndIndex()).toBe(6);
    });
  });

  describe("uppdateCallbacks", () => {
    it("uses updated visible range callback", () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        onVisibleRangeChange: firstCallback,
      });

      firstCallback.mockClear();

      calculateRenderRange.uppdateCallbacks({
        onVisibleRangeChange: secondCallback,
      });

      calculateRenderRange.handleScroll(300);
      calculateRenderRange.calculate();

      expect(firstCallback).not.toHaveBeenCalled();

      expect(secondCallback).toHaveBeenCalledWith(3, 5);
    });

    it("uses updated reach callbacks", () => {
      const onReachStart = vi.fn();
      const onReachEnd = vi.fn();

      const calculateRenderRange = createCalculateRenderRange({
        listSize: 10,
        remainingItemsThreshold: 2,
      });

      calculateRenderRange.uppdateCallbacks({
        onReachStart,
        onReachEnd,
      });

      calculateRenderRange.handleScroll(600);
      calculateRenderRange.calculate();

      expect(onReachEnd).toHaveBeenCalledTimes(1);

      calculateRenderRange.handleScroll(0);
      calculateRenderRange.calculate();

      expect(onReachStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("getIndexByOffset", () => {
    it("delegates to measurement.findNearestIndex", () => {
      const measurement = createMeasurement();

      vi.mocked(measurement.findNearestIndex).mockReturnValue(7);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      vi.mocked(measurement.findNearestIndex).mockClear();

      expect(calculateRenderRange.getIndexByOffset(750)).toBe(7);

      expect(measurement.findNearestIndex).toHaveBeenCalledWith(750);
    });
  });

  describe("getOffset", () => {
    it("returns measurement offset when scrolling is not compressed", () => {
      const measurement = createMeasurement();

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      calculateRenderRange.handleScroll(300);
      calculateRenderRange.calculate();

      expect(calculateRenderRange.getOffset(5)).toBe(500);
    });

    it("adjusts offset relative to virtual scroll position when compressed", () => {
      const total = MAX_SAFE_SCROLL_RANGE + 100_000;

      const measurement = createMeasurement({
        total,
      });

      vi.mocked(nativeScrollToVirtual).mockReturnValue(5000);

      vi.mocked(measurement.getOffset).mockReturnValue(5500);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      calculateRenderRange.handleScroll(1000);
      calculateRenderRange.calculate();

      expect(calculateRenderRange.getOffset(5)).toBe(1500);
    });
  });

  describe("getNativeScrollOffset", () => {
    it("returns virtual offset unchanged when total size is within safe range", () => {
      const measurement = createMeasurement({
        total: 1000,
      });

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      expect(calculateRenderRange.getNativeScrollOffset(500)).toBe(500);

      expect(virtualScrollToNative).not.toHaveBeenCalled();
    });

    it("converts virtual offset when total size exceeds safe range", () => {
      const viewPortSize = 200;
      const total = MAX_SAFE_SCROLL_RANGE + 10_000;

      const measurement = createMeasurement({
        total,
      });

      vi.mocked(virtualScrollToNative).mockReturnValue(1234);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
        viewPortSize,
      });

      const result = calculateRenderRange.getNativeScrollOffset(5000);

      expect(result).toBe(1234);

      expect(virtualScrollToNative).toHaveBeenCalledWith(
        5000,
        MAX_SAFE_SCROLL_RANGE - viewPortSize,
        total - viewPortSize,
      );
    });
  });

  describe("getScrollOffsetByIndex", () => {
    it("returns measurement offset when scrolling is not compressed", () => {
      const measurement = createMeasurement();

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      expect(calculateRenderRange.getScrollOffsetByIndex(4)).toBe(400);

      expect(measurement.getOffset).toHaveBeenCalledWith(4);
    });

    it("converts measurement offset when scrolling is compressed", () => {
      const total = MAX_SAFE_SCROLL_RANGE + 10_000;

      const measurement = createMeasurement({
        total,
      });

      vi.mocked(measurement.getOffset).mockReturnValue(5000);

      vi.mocked(virtualScrollToNative).mockReturnValue(1200);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      const result = calculateRenderRange.getScrollOffsetByIndex(4);

      expect(result).toBe(1200);

      expect(measurement.getOffset).toHaveBeenCalledWith(4);
    });
  });

  describe("compressed scrolling", () => {
    it("uses MAX_SAFE_SCROLL_RANGE as safe range", () => {
      const measurement = createMeasurement({
        total: MAX_SAFE_SCROLL_RANGE + 1000,
      });

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
      });

      expect(calculateRenderRange.getSafeRange()).toBe(MAX_SAFE_SCROLL_RANGE);
    });

    it("converts native scroll to virtual scroll", () => {
      const viewPortSize = 200;
      const total = MAX_SAFE_SCROLL_RANGE + 10_000;

      const measurement = createMeasurement({
        total,
      });

      vi.mocked(nativeScrollToVirtual).mockReturnValue(5000);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
        viewPortSize,
      });

      vi.mocked(nativeScrollToVirtual).mockClear();

      calculateRenderRange.handleScroll(1000);
      calculateRenderRange.calculate();

      expect(nativeScrollToVirtual).toHaveBeenCalledWith(
        1000,
        MAX_SAFE_SCROLL_RANGE - viewPortSize,
        total - viewPortSize,
      );
    });

    it("uses converted virtual scroll to calculate visible range", () => {
      const total = MAX_SAFE_SCROLL_RANGE + 100_000;

      const measurement = createMeasurement({
        total,
        rowSize: 100,
      });

      vi.mocked(nativeScrollToVirtual).mockReturnValue(5000);

      const calculateRenderRange = createCalculateRenderRange({
        measurement,
        viewPortSize: 200,
      });

      calculateRenderRange.handleScroll(1000);
      calculateRenderRange.calculate();

      expect(calculateRenderRange.getVisibleStartIndex()).toBe(50);

      expect(calculateRenderRange.getVisibleEndIndex()).toBe(52);
    });
  });
});
