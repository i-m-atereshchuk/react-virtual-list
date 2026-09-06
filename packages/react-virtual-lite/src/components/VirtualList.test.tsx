import { act, cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VirtualListRef } from "../types/List";

import { VirtualList } from "./VirtualList";

describe("VirtualList", () => {
  let resizeCallback: ResizeObserverCallback | undefined;
  let observe: ReturnType<typeof vi.fn>;
  let unobserve: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resizeCallback = undefined;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();

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
    cleanup();
  });

  const fireResize = (width: number, height: number) => {
    if (!resizeCallback) {
      throw new Error("ResizeObserver was not created");
    }

    act(() => {
      resizeCallback!(
        [{ contentRect: { width, height } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
  };

  const items = Array.from({ length: 50 }, (_, index) => `Item ${index}`);

  const renderList = (
    props: Partial<
      Omit<
        React.ComponentProps<typeof VirtualList<string>>,
        "list" | "keyExtractor" | "renderItem"
      >
    > = {},
  ) => {
    return render(
      <VirtualList
        list={items}
        rowSize={20}
        keyExtractor={(item) => item}
        renderItem={(item) => <span>{item}</span>}
        {...props}
      />,
    );
  };

  it("observes its container on mount", () => {
    renderList();

    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("does not render the list before the container has been measured", () => {
    const { queryByTestId } = renderList();

    expect(queryByTestId("react-virtual-lite")).toBeNull();
  });

  it("does not render the list for an empty list, even once measured", () => {
    const { queryByTestId } = render(
      <VirtualList
        list={[]}
        rowSize={20}
        keyExtractor={(item) => String(item)}
        renderItem={() => null}
      />,
    );

    fireResize(400, 300);

    expect(queryByTestId("react-virtual-lite")).toBeNull();
  });

  it("does not render the list while the container has zero width or height", () => {
    const { queryByTestId } = renderList();

    fireResize(0, 300);
    expect(queryByTestId("react-virtual-lite")).toBeNull();

    fireResize(400, 0);
    expect(queryByTestId("react-virtual-lite")).toBeNull();
  });

  it("renders the list once the container is measured with a non-empty list", () => {
    const { queryByTestId } = renderList();

    fireResize(400, 300);

    expect(queryByTestId("react-virtual-lite")).not.toBeNull();
  });

  it("passes the measured container size as the viewport size", () => {
    const { queryByTestId } = renderList();

    fireResize(400, 300);

    const list = queryByTestId("react-virtual-lite") as HTMLElement;

    expect(list.style.height).toBe("300px");
    expect(list.style.width).toBe("400px");
  });

  it("re-renders the list when the container is resized again", () => {
    const { queryByTestId } = renderList();

    fireResize(400, 300);
    fireResize(600, 500);

    const list = queryByTestId("react-virtual-lite") as HTMLElement;

    expect(list.style.height).toBe("500px");
    expect(list.style.width).toBe("600px");
  });

  it("disconnects the resize observer on unmount", () => {
    const { unmount } = renderList();

    unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("forwards the ref once the list becomes ready", () => {
    const ref = createRef<VirtualListRef>();

    render(
      <VirtualList
        ref={ref}
        list={items}
        rowSize={20}
        keyExtractor={(item) => item}
        renderItem={(item) => <span>{item}</span>}
      />,
    );

    expect(ref.current).toBeNull();

    fireResize(400, 300);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.scrollToIndex).toBe("function");
    expect(typeof ref.current?.scrollToOffset).toBe("function");
  });

  it("wraps the container in a full-size, non-semantic div", () => {
    const { container } = renderList();

    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.getAttribute("role")).toBe("none");
    expect(wrapper.style.width).toBe("100%");
    expect(wrapper.style.height).toBe("100%");
  });
});
