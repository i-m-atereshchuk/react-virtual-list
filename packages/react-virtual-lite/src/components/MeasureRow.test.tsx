import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MeasureRow } from "./MeasureRow";

describe("MeasureRow", () => {
  afterEach(() => {
    cleanup();
  });

  const noop = () => {};

  it("renders its children", () => {
    const { getByText } = render(
      <MeasureRow index={0} offset={0} observeRow={vi.fn(() => noop)}>
        <span>row content</span>
      </MeasureRow>,
    );

    expect(getByText("row content")).toBeTruthy();
  });

  it("sets a data-testid keyed by index", () => {
    const { getByTestId } = render(
      <MeasureRow index={7} offset={0} observeRow={vi.fn(() => noop)}>
        content
      </MeasureRow>,
    );

    expect(getByTestId("react-virtual-lite-list-item-7")).toBeTruthy();
  });

  it("exposes the offset as a data attribute", () => {
    const { getByTestId } = render(
      <MeasureRow index={0} offset={123} observeRow={vi.fn(() => noop)}>
        content
      </MeasureRow>,
    );

    expect(
      getByTestId("react-virtual-lite-list-item-0").getAttribute("data-offset"),
    ).toBe("123");
  });

  it("sets role=none", () => {
    const { getByTestId } = render(
      <MeasureRow index={0} offset={0} observeRow={vi.fn(() => noop)}>
        content
      </MeasureRow>,
    );

    expect(
      getByTestId("react-virtual-lite-list-item-0").getAttribute("role"),
    ).toBe("none");
  });

  describe("vertical orientation (default)", () => {
    it("positions the row absolutely and translates it on the Y axis", () => {
      const { getByTestId } = render(
        <MeasureRow index={0} offset={80} observeRow={vi.fn(() => noop)}>
          content
        </MeasureRow>,
      );

      const row = getByTestId("react-virtual-lite-list-item-0") as HTMLElement;

      expect(row.style.position).toBe("absolute");
      expect(row.style.left).toBe("0px");
      expect(row.style.right).toBe("0px");
      expect(row.style.transform).toBe("translateY(80px)");
      expect(row.style.top).toBe("");
      expect(row.style.width).toBe("");
    });

    it("used when orientation is explicitly vertical", () => {
      const { getByTestId } = render(
        <MeasureRow
          index={0}
          offset={40}
          observeRow={vi.fn(() => noop)}
          orientation="vertical"
        >
          content
        </MeasureRow>,
      );

      expect(
        (getByTestId("react-virtual-lite-list-item-0") as HTMLElement).style
          .transform,
      ).toBe("translateY(40px)");
    });
  });

  describe("horizontal orientation", () => {
    it("positions the row absolutely and translates it on the X axis", () => {
      const { getByTestId } = render(
        <MeasureRow
          index={0}
          offset={64}
          observeRow={vi.fn(() => noop)}
          orientation="horizontal"
        >
          content
        </MeasureRow>,
      );

      const row = getByTestId("react-virtual-lite-list-item-0") as HTMLElement;

      expect(row.style.position).toBe("absolute");
      expect(row.style.top).toBe("0px");
      expect(row.style.bottom).toBe("0px");
      expect(row.style.width).toBe("max-content");
      expect(row.style.transform).toBe("translateX(64px)");
      expect(row.style.left).toBe("");
    });
  });

  describe("observeRow lifecycle", () => {
    it("calls observeRow with the row element and index on mount", () => {
      const observeRow = vi.fn<(element: Element, index: number) => () => void>(
        () => noop,
      );

      const { getByTestId } = render(
        <MeasureRow index={3} offset={0} observeRow={observeRow}>
          content
        </MeasureRow>,
      );

      expect(observeRow).toHaveBeenCalledTimes(1);

      const [element, index] = observeRow.mock.calls[0]!;

      expect(element).toBe(getByTestId("react-virtual-lite-list-item-3"));
      expect(index).toBe(3);
    });

    it("calls the cleanup function returned by observeRow on unmount", () => {
      const cleanup = vi.fn();
      const observeRow = vi.fn(() => cleanup);

      const { unmount } = render(
        <MeasureRow index={0} offset={0} observeRow={observeRow}>
          content
        </MeasureRow>,
      );

      expect(cleanup).not.toHaveBeenCalled();

      unmount();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("re-observes with the new index when index changes", () => {
      const firstCleanup = vi.fn();
      const secondCleanup = vi.fn();

      const observeRow = vi
        .fn()
        .mockReturnValueOnce(firstCleanup)
        .mockReturnValueOnce(secondCleanup);

      const { rerender } = render(
        <MeasureRow index={0} offset={0} observeRow={observeRow}>
          content
        </MeasureRow>,
      );

      expect(observeRow).toHaveBeenCalledTimes(1);
      expect(firstCleanup).not.toHaveBeenCalled();

      rerender(
        <MeasureRow index={1} offset={0} observeRow={observeRow}>
          content
        </MeasureRow>,
      );

      expect(firstCleanup).toHaveBeenCalledTimes(1);
      expect(observeRow).toHaveBeenCalledTimes(2);
      expect(observeRow.mock.calls[1]![1]).toBe(1);
    });

    it("does not re-observe when only the offset changes", () => {
      const observeRow = vi.fn(() => noop);

      const { rerender } = render(
        <MeasureRow index={0} offset={0} observeRow={observeRow}>
          content
        </MeasureRow>,
      );

      rerender(
        <MeasureRow index={0} offset={999} observeRow={observeRow}>
          content
        </MeasureRow>,
      );

      expect(observeRow).toHaveBeenCalledTimes(1);
    });

    it("does not re-observe when only the orientation changes", () => {
      const observeRow = vi.fn(() => noop);

      const { rerender } = render(
        <MeasureRow
          index={0}
          offset={0}
          observeRow={observeRow}
          orientation="vertical"
        >
          content
        </MeasureRow>,
      );

      rerender(
        <MeasureRow
          index={0}
          offset={0}
          observeRow={observeRow}
          orientation="horizontal"
        >
          content
        </MeasureRow>,
      );

      expect(observeRow).toHaveBeenCalledTimes(1);
    });
  });
});
