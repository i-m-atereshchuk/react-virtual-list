import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVirtualized } from "./use-virtualized";

const mocks = vi.hoisted(() => {
  const measurementStatic = {
    type: "static",
  };

  const measurementDynamic = {
    type: "dynamic",
  };

  const measurementStore = {
    observeRow: vi.fn(),
  };

  const calculateRenderRange = {
    uppdateProperties: vi.fn(),
    uppdateCallbacks: vi.fn(),

    getSafeRange: vi.fn(() => 1000),
    getOffset: vi.fn(),
    handleScroll: vi.fn(),

    getStartIndex: vi.fn(() => 2),
    getEndIndex: vi.fn(() => 8),
  };

  const frameScheduler = {
    subscribe: vi.fn(() => vi.fn()),
    getVestion: vi.fn(() => 0),

    connect: vi.fn(),
    disconect: vi.fn(),
  };

  return {
    measurementStatic,
    measurementDynamic,
    measurementStore,
    calculateRenderRange,
    frameScheduler,

    SizeEstimator: vi.fn(),
    MeasurementStatic: vi.fn(),
    MeasurementDynamic: vi.fn(),
    MeasurementStore: vi.fn(),
    CalculateRenderRange: vi.fn(),
    FrameScheduler: vi.fn(),
  };
});

vi.mock("../core/SizeEstimator", () => ({
  SizeEstimator: mocks.SizeEstimator.mockImplementation(function (
    estimatedRowSize: number,
  ) {
    return {
      estimatedRowSize,
    };
  }),
}));

vi.mock("../core/MeasurementStatic", () => ({
  MeasurementStatic: mocks.MeasurementStatic.mockImplementation(function () {
    return mocks.measurementStatic;
  }),
}));

vi.mock("../core/MeasurementDynamic", () => ({
  MeasurementDynamic: mocks.MeasurementDynamic.mockImplementation(function () {
    return mocks.measurementDynamic;
  }),
}));

vi.mock("../core/MeasurementStore", () => ({
  MeasurementStore: mocks.MeasurementStore.mockImplementation(function () {
    return mocks.measurementStore;
  }),
}));

vi.mock("../core/CalculateRenderRange", () => ({
  CalculateRenderRange: mocks.CalculateRenderRange.mockImplementation(
    function () {
      return mocks.calculateRenderRange;
    },
  ),
}));

vi.mock("../core/FrameScheduler", () => ({
  FrameScheduler: mocks.FrameScheduler.mockImplementation(function () {
    return mocks.frameScheduler;
  }),
}));

const defaultProps = {
  rowSize: 50,
  listSize: 100,
  estimatedRowSize: 40,
  orientation: "vertical" as const,
  viewPortSize: 500,
  overscan: 2,
  remainingItemsThreshold: 5,

  onReachEnd: vi.fn(),
  onReachStart: vi.fn(),
  onVisibleRangeChange: vi.fn(),
};

describe("useVirtualized", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.calculateRenderRange.getSafeRange.mockReturnValue(1000);
    mocks.calculateRenderRange.getStartIndex.mockReturnValue(2);
    mocks.calculateRenderRange.getEndIndex.mockReturnValue(8);

    mocks.frameScheduler.subscribe.mockImplementation(() => vi.fn());
    mocks.frameScheduler.getVestion.mockReturnValue(0);
  });

  it("creates MeasurementStatic when rowSize is a number", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.MeasurementStatic).toHaveBeenCalledTimes(1);
    expect(mocks.MeasurementStatic).toHaveBeenCalledWith(
      defaultProps.listSize,
      defaultProps.rowSize,
    );

    expect(mocks.SizeEstimator).not.toHaveBeenCalled();
    expect(mocks.MeasurementDynamic).not.toHaveBeenCalled();
  });

  it("creates MeasurementDynamic when rowSize is not a number", () => {
    const props = {
      ...defaultProps,
      rowSize: undefined,
    };

    renderHook(() => useVirtualized(props));

    expect(mocks.SizeEstimator).toHaveBeenCalledTimes(1);
    expect(mocks.SizeEstimator).toHaveBeenCalledWith(
      defaultProps.estimatedRowSize,
    );

    expect(mocks.MeasurementDynamic).toHaveBeenCalledTimes(1);

    expect(mocks.MeasurementStatic).not.toHaveBeenCalled();
  });

  it("creates MeasurementStore with measurement, orientation and rowSize", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.MeasurementStore).toHaveBeenCalledTimes(1);
    expect(mocks.MeasurementStore).toHaveBeenCalledWith(
      mocks.measurementStatic,
      defaultProps.orientation,
      defaultProps.rowSize,
    );
  });

  it("creates CalculateRenderRange with initial properties and callbacks", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.CalculateRenderRange).toHaveBeenCalledTimes(1);

    expect(mocks.CalculateRenderRange).toHaveBeenCalledWith({
      measurement: mocks.measurementStatic,

      viewPortSize: defaultProps.viewPortSize,
      overscan: defaultProps.overscan,
      listSize: defaultProps.listSize,

      onReachEnd: defaultProps.onReachEnd,
      onReachStart: defaultProps.onReachStart,
      onVisibleRangeChange: defaultProps.onVisibleRangeChange,

      remainingItemsThreshold: defaultProps.remainingItemsThreshold,
    });
  });

  it("creates FrameScheduler with measurement and CalculateRenderRange", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.FrameScheduler).toHaveBeenCalledTimes(1);
    expect(mocks.FrameScheduler).toHaveBeenCalledWith([
      mocks.measurementStatic,
      mocks.calculateRenderRange,
    ]);
  });

  it("connects FrameScheduler on mount", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.frameScheduler.connect).toHaveBeenCalledTimes(1);
  });

  it("disconnects FrameScheduler on unmount", () => {
    const { unmount } = renderHook(() => useVirtualized(defaultProps));

    expect(mocks.frameScheduler.disconect).not.toHaveBeenCalled();

    unmount();

    expect(mocks.frameScheduler.disconect).toHaveBeenCalledTimes(1);
  });

  it("updates CalculateRenderRange properties on mount", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.calculateRenderRange.uppdateProperties).toHaveBeenCalledWith({
      viewPortSize: defaultProps.viewPortSize,
      overscan: defaultProps.overscan,
      listSize: defaultProps.listSize,
      remainingItemsThreshold: defaultProps.remainingItemsThreshold,
    });
  });

  it("updates callbacks on mount", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.calculateRenderRange.uppdateCallbacks).toHaveBeenCalledWith({
      onReachEnd: defaultProps.onReachEnd,
      onReachStart: defaultProps.onReachStart,
      onVisibleRangeChange: defaultProps.onVisibleRangeChange,
    });
  });

  it("updates properties when relevant props change", () => {
    const { rerender } = renderHook((props) => useVirtualized(props), {
      initialProps: defaultProps,
    });

    mocks.calculateRenderRange.uppdateProperties.mockClear();

    const nextProps = {
      ...defaultProps,
      listSize: 200,
      viewPortSize: 800,
      overscan: 4,
      remainingItemsThreshold: 10,
    };

    rerender(nextProps);

    expect(mocks.calculateRenderRange.uppdateProperties).toHaveBeenCalledTimes(
      1,
    );

    expect(mocks.calculateRenderRange.uppdateProperties).toHaveBeenCalledWith({
      viewPortSize: 800,
      overscan: 4,
      listSize: 200,
      remainingItemsThreshold: 10,
    });
  });

  it("does not recreate service instances after rerender", () => {
    const { rerender } = renderHook((props) => useVirtualized(props), {
      initialProps: defaultProps,
    });

    rerender({
      ...defaultProps,
      listSize: 200,
      viewPortSize: 800,
    });

    expect(mocks.MeasurementStatic).toHaveBeenCalledTimes(1);
    expect(mocks.MeasurementStore).toHaveBeenCalledTimes(1);
    expect(mocks.CalculateRenderRange).toHaveBeenCalledTimes(1);
    expect(mocks.FrameScheduler).toHaveBeenCalledTimes(1);
  });

  it("returns values from CalculateRenderRange and MeasurementStore", () => {
    const { result } = renderHook(() => useVirtualized(defaultProps));

    expect(result.current.totalSize).toBe(1000);
    expect(result.current.startIndex).toBe(2);
    expect(result.current.endIndex).toBe(8);

    expect(result.current.getOffset).toBe(mocks.calculateRenderRange.getOffset);

    expect(result.current.handleScroll).toBe(
      mocks.calculateRenderRange.handleScroll,
    );

    expect(result.current.observeRow).toBe(mocks.measurementStore.observeRow);

    expect(result.current.renderRange).toBe(mocks.calculateRenderRange);
  });

  it("subscribes to FrameScheduler through useSyncExternalStore", () => {
    renderHook(() => useVirtualized(defaultProps));

    expect(mocks.frameScheduler.subscribe).toHaveBeenCalled();
    expect(mocks.frameScheduler.getVestion).toHaveBeenCalled();
  });
});
