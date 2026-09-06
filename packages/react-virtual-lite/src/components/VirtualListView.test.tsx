import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VirtualListView } from "./VirtualListView";

const mocks = vi.hoisted(() => ({
  useVirtualized: vi.fn(),
  useVirtualListHandle: vi.fn(),
}));

vi.mock("../hooks/use-virtualized", () => ({
  useVirtualized: mocks.useVirtualized,
}));

vi.mock("../hooks/use-virtual-list-handle", () => ({
  useVirtualListHandle: mocks.useVirtualListHandle,
}));

describe("VirtualListView", () => {
  const items = Array.from({ length: 10 }, (_, index) => `Item ${index}`);

  let observeRow: ReturnType<typeof vi.fn>;
  let handleScroll: ReturnType<typeof vi.fn>;
  let getOffset: ReturnType<typeof vi.fn>;
  const renderRange = { id: "render-range" };

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    observeRow = vi.fn(() => () => {});
    handleScroll = vi.fn();
    getOffset = vi.fn((index: number) => index * 10);

    mocks.useVirtualized.mockReturnValue({
      renderRange,
      observeRow,
      getOffset,
      totalSize: 1000,
      handleScroll,
      startIndex: 1,
      endIndex: 4,
    });
  });

  const renderView = (
    props: Partial<React.ComponentProps<typeof VirtualListView<string>>> = {},
  ) => {
    return render(
      <VirtualListView
        list={items}
        keyExtractor={(item) => item}
        renderItem={(item, index) => <span>{`${item}-${index}`}</span>}
        {...props}
      />,
    );
  };

  describe("rendering the visible range", () => {
    it("renders only the rows between startIndex and endIndex", () => {
      const { queryByTestId } = renderView();

      expect(queryByTestId("react-virtual-lite-list-item-0")).toBeNull();
      expect(queryByTestId("react-virtual-lite-list-item-1")).not.toBeNull();
      expect(queryByTestId("react-virtual-lite-list-item-2")).not.toBeNull();
      expect(queryByTestId("react-virtual-lite-list-item-3")).not.toBeNull();
      expect(queryByTestId("react-virtual-lite-list-item-4")).toBeNull();
    });

    it("calls renderItem with the item and its index for each rendered row", () => {
      const renderItem = vi.fn((item: string, index: number) => (
        <span>{`${item}-${index}`}</span>
      ));

      renderView({ renderItem });

      expect(renderItem).toHaveBeenCalledTimes(3);
      expect(renderItem).toHaveBeenCalledWith(items[1], 1);
      expect(renderItem).toHaveBeenCalledWith(items[2], 2);
      expect(renderItem).toHaveBeenCalledWith(items[3], 3);
    });

    it("calls keyExtractor with the item and its index for each rendered row", () => {
      const keyExtractor = vi.fn(
        (item: string, index: number) => `${item}-${index}`,
      );

      renderView({ keyExtractor });

      expect(keyExtractor).toHaveBeenCalledTimes(3);
      expect(keyExtractor).toHaveBeenCalledWith(items[1], 1);
    });

    it("passes measurement's offset for each rendered row", () => {
      const { getByTestId } = renderView();

      expect(
        getByTestId("react-virtual-lite-list-item-1").getAttribute(
          "data-offset",
        ),
      ).toBe("10");
      expect(
        getByTestId("react-virtual-lite-list-item-3").getAttribute(
          "data-offset",
        ),
      ).toBe("30");
    });

    it("re-renders an empty range when startIndex equals endIndex", () => {
      mocks.useVirtualized.mockReturnValue({
        renderRange,
        observeRow,
        getOffset,
        totalSize: 1000,
        handleScroll,
        startIndex: 2,
        endIndex: 2,
      });

      const { queryAllByTestId } = renderView();

      expect(queryAllByTestId(/react-virtual-lite-list-item-/)).toHaveLength(0);
    });
  });

  describe("container", () => {
    it("renders the list container with the expected attributes", () => {
      const { getByTestId } = renderView();

      const list = getByTestId("react-virtual-lite");

      expect(list.getAttribute("role")).toBe("list");
      expect(list.getAttribute("data-react-virtual-list")).toBe("list");
      expect(list.getAttribute("aria-busy")).toBe("false");
    });

    it("reflects isLoading on aria-busy", () => {
      const { getByTestId } = renderView({ isLoading: true });

      expect(getByTestId("react-virtual-lite").getAttribute("aria-busy")).toBe(
        "true",
      );
    });

    it("sizes the container using viewPortHeight/viewPortWidth", () => {
      const { getByTestId } = renderView({
        viewPortHeight: 250,
        viewPortWidth: 320,
      });

      const list = getByTestId("react-virtual-lite") as HTMLElement;

      expect(list.style.height).toBe("250px");
      expect(list.style.width).toBe("320px");
    });
  });

  describe("scrolling", () => {
    it("forwards scrollTop to handleScroll for vertical orientation", () => {
      const { getByTestId } = renderView();

      const list = getByTestId("react-virtual-lite");

      fireEvent.scroll(list, { target: { scrollTop: 123 } });

      expect(handleScroll).toHaveBeenCalledWith(123);
    });

    it("forwards scrollLeft to handleScroll for horizontal orientation", () => {
      const { getByTestId } = renderView({ orientation: "horizontal" });

      const list = getByTestId("react-virtual-lite");

      fireEvent.scroll(list, { target: { scrollLeft: 77 } });

      expect(handleScroll).toHaveBeenCalledWith(77);
    });

    it("also calls the user-provided onScroll handler", () => {
      const onScroll = vi.fn();

      const { getByTestId } = renderView({ onScroll });

      const list = getByTestId("react-virtual-lite");

      fireEvent.scroll(list, { target: { scrollTop: 5 } });

      expect(onScroll).toHaveBeenCalledTimes(1);
      expect(handleScroll).toHaveBeenCalledWith(5);
    });
  });

  describe("sizer", () => {
    it("renders the sizer with the measurement's total size", () => {
      const { getByTestId } = renderView();

      const list = getByTestId("react-virtual-lite");
      const sizer = list.lastElementChild as HTMLElement;

      expect(sizer.style.height).toBe("1000px");
    });

    it("sizes the sizer by width for horizontal orientation", () => {
      const { getByTestId } = renderView({ orientation: "horizontal" });

      const list = getByTestId("react-virtual-lite");
      const sizer = list.lastElementChild as HTMLElement;

      expect(sizer.style.width).toBe("1000px");
    });
  });

  describe("useVirtualized wiring", () => {
    it("derives listSize from the list length", () => {
      renderView();

      expect(mocks.useVirtualized).toHaveBeenCalledWith(
        expect.objectContaining({ listSize: items.length }),
      );
    });

    it("uses viewPortHeight as viewPortSize for vertical orientation", () => {
      renderView({ viewPortHeight: 555 });

      expect(mocks.useVirtualized).toHaveBeenCalledWith(
        expect.objectContaining({ viewPortSize: 555 }),
      );
    });

    it("uses viewPortWidth as viewPortSize for horizontal orientation", () => {
      renderView({ orientation: "horizontal", viewPortWidth: 444 });

      expect(mocks.useVirtualized).toHaveBeenCalledWith(
        expect.objectContaining({ viewPortSize: 444 }),
      );
    });

    it("applies the documented defaults", () => {
      renderView();

      expect(mocks.useVirtualized).toHaveBeenCalledWith(
        expect.objectContaining({
          overscan: 3,
          estimatedRowSize: 40,
          orientation: "vertical",
          remainingItemsThreshold: 3,
          viewPortSize: 400,
        }),
      );
    });

    it("passes rowSize and estimatedRowSize through", () => {
      renderView({ rowSize: 42, estimatedRowSize: 99 });

      expect(mocks.useVirtualized).toHaveBeenCalledWith(
        expect.objectContaining({ rowSize: 42, estimatedRowSize: 99 }),
      );
    });

    it("forwards onReachEnd/onReachStart/onVisibleRangeChange", () => {
      const onReachEnd = vi.fn();
      const onReachStart = vi.fn();
      const onVisibleRangeChange = vi.fn();

      renderView({ onReachEnd, onReachStart, onVisibleRangeChange });

      expect(mocks.useVirtualized).toHaveBeenCalledWith(
        expect.objectContaining({
          onReachEnd,
          onReachStart,
          onVisibleRangeChange,
        }),
      );
    });
  });

  describe("useVirtualListHandle wiring", () => {
    it("passes the render range, orientation, listSize and totalSize", () => {
      renderView({ orientation: "horizontal" });

      expect(mocks.useVirtualListHandle).toHaveBeenCalledWith(
        expect.objectContaining({
          orientation: "horizontal",
          listSize: items.length,
          totalSize: 1000,
          calculateRenderRange: renderRange,
        }),
      );
    });
  });

  describe("row measurement", () => {
    it("passes observeRow through to each rendered row", () => {
      renderView();

      expect(observeRow).toHaveBeenCalledTimes(3);
      expect(observeRow.mock.calls.map((call) => call[1]).sort()).toEqual([
        1, 2, 3,
      ]);
    });
  });
});
