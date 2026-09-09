import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VirtualListSizer } from "./VirtualListSizer";

describe("VirtualListSizer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a single div with role=none", () => {
    const { container } = render(<VirtualListSizer totalSize={100} />);

    const div = container.firstElementChild;

    expect(div?.tagName).toBe("DIV");
    expect(div?.getAttribute("role")).toBe("none");
    expect(container.childElementCount).toBe(1);
  });

  it("sets height to totalSize for the default (vertical) orientation", () => {
    const { container } = render(<VirtualListSizer totalSize={250} />);

    const div = container.firstElementChild as HTMLDivElement;

    expect(div.style.height).toBe("250px");
    expect(div.style.width).toBe("");
  });

  it("sets height to totalSize when orientation is explicitly vertical", () => {
    const { container } = render(
      <VirtualListSizer totalSize={300} orientation="vertical" />,
    );

    const div = container.firstElementChild as HTMLDivElement;

    expect(div.style.height).toBe("300px");
    expect(div.style.width).toBe("");
  });

  it("sets width to totalSize for horizontal orientation", () => {
    const { container } = render(
      <VirtualListSizer totalSize={400} orientation="horizontal" />,
    );

    const div = container.firstElementChild as HTMLDivElement;

    expect(div.style.width).toBe("400px");
    expect(div.style.height).toBe("");
  });

  it("supports zero as totalSize", () => {
    const { container } = render(<VirtualListSizer totalSize={0} />);

    const div = container.firstElementChild as HTMLDivElement;

    expect(div.style.height).toBe("0px");
  });

  it("updates the size style when totalSize changes", () => {
    const { container, rerender } = render(
      <VirtualListSizer totalSize={100} />,
    );

    rerender(<VirtualListSizer totalSize={500} />);

    const div = container.firstElementChild as HTMLDivElement;

    expect(div.style.height).toBe("500px");
  });

  it("switches from height to width when orientation changes", () => {
    const { container, rerender } = render(
      <VirtualListSizer totalSize={200} orientation="vertical" />,
    );

    rerender(<VirtualListSizer totalSize={200} orientation="horizontal" />);

    const div = container.firstElementChild as HTMLDivElement;

    expect(div.style.height).toBe("");
    expect(div.style.width).toBe("200px");
  });
});
