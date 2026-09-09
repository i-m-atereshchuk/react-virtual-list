import { describe, expect, it } from "vitest";

import { TotalScrollSize } from "./TotalScrollSize";

describe("TotalScrollSize", () => {
  it("stores the initial total", () => {
    const totalScrollSize = new TotalScrollSize(1000);

    expect(totalScrollSize.getTotal()).toBe(1000);
  });

  it("updates total when row size increases", () => {
    const totalScrollSize = new TotalScrollSize(1000);

    totalScrollSize.updateTotal(100, 150);

    expect(totalScrollSize.getTotal()).toBe(1050);
  });

  it("updates total when row size decreases", () => {
    const totalScrollSize = new TotalScrollSize(1000);

    totalScrollSize.updateTotal(150, 100);

    expect(totalScrollSize.getTotal()).toBe(950);
  });

  it("keeps total unchanged when row size does not change", () => {
    const totalScrollSize = new TotalScrollSize(1000);

    totalScrollSize.updateTotal(100, 100);

    expect(totalScrollSize.getTotal()).toBe(1000);
  });

  it("supports multiple updates", () => {
    const totalScrollSize = new TotalScrollSize(1000);

    totalScrollSize.updateTotal(100, 150);
    totalScrollSize.updateTotal(200, 180);
    totalScrollSize.updateTotal(50, 80);

    expect(totalScrollSize.getTotal()).toBe(1060);
  });

  it("supports zero as the initial total", () => {
    const totalScrollSize = new TotalScrollSize(0);

    expect(totalScrollSize.getTotal()).toBe(0);
  });

  it("adds a new row size when previous row size is zero", () => {
    const totalScrollSize = new TotalScrollSize(1000);

    totalScrollSize.updateTotal(0, 100);

    expect(totalScrollSize.getTotal()).toBe(1100);
  });

  it("removes a row size when next row size is zero", () => {
    const totalScrollSize = new TotalScrollSize(1000);

    totalScrollSize.updateTotal(100, 0);

    expect(totalScrollSize.getTotal()).toBe(900);
  });

  it("supports fractional row sizes", () => {
    const totalScrollSize = new TotalScrollSize(1000.5);

    totalScrollSize.updateTotal(100.25, 150.75);

    expect(totalScrollSize.getTotal()).toBeCloseTo(1051);
  });
});
