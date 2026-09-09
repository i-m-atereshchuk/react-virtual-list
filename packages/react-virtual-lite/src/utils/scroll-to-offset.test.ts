import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scrollToOffset } from "./scroll-to-offset";

describe("scrollToOffset", () => {
  let animationFrameCallbacks: FrameRequestCallback[];
  let now: number;

  beforeEach(() => {
    animationFrameCallbacks = [];
    now = 1000;

    vi.spyOn(performance, "now").mockImplementation(() => now);

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        animationFrameCallbacks.push(callback);

        return animationFrameCallbacks.length;
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const flushAnimationFrame = (time: number) => {
    const callback = animationFrameCallbacks.shift();

    if (!callback) {
      throw new Error("No animation frame scheduled");
    }

    callback(time);
  };

  describe("vertical", () => {
    it("scrolls vertically by default", () => {
      const element = document.createElement("div");

      element.scrollTop = 100;

      scrollToOffset(element, 500);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      flushAnimationFrame(1300);

      expect(element.scrollTop).toBe(500);
    });

    it("uses the provided duration", () => {
      const element = document.createElement("div");

      element.scrollTop = 0;

      scrollToOffset(element, 100, 1000);

      flushAnimationFrame(1500);

      // progress = 0.5
      // easing at 0.5 = 0.5
      expect(element.scrollTop).toBeCloseTo(50);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

      flushAnimationFrame(2000);

      expect(element.scrollTop).toBeCloseTo(100);
    });

    it("starts from the current scrollTop", () => {
      const element = document.createElement("div");

      element.scrollTop = 200;

      scrollToOffset(element, 600, 1000);

      flushAnimationFrame(1500);

      expect(element.scrollTop).toBeCloseTo(400);
    });

    it("can scroll backwards", () => {
      const element = document.createElement("div");

      element.scrollTop = 500;

      scrollToOffset(element, 100, 1000);

      flushAnimationFrame(1500);

      expect(element.scrollTop).toBeCloseTo(300);

      flushAnimationFrame(2000);

      expect(element.scrollTop).toBeCloseTo(100);
    });
  });

  describe("horizontal", () => {
    it("scrolls using scrollLeft", () => {
      const element = document.createElement("div");

      element.scrollLeft = 100;
      element.scrollTop = 50;

      scrollToOffset(element, 500, 300, "horizontal");

      flushAnimationFrame(1300);

      expect(element.scrollLeft).toBe(500);

      // Vertical position should not be modified.
      expect(element.scrollTop).toBe(50);
    });

    it("starts from the current scrollLeft", () => {
      const element = document.createElement("div");

      element.scrollLeft = 200;

      scrollToOffset(element, 600, 1000, "horizontal");

      flushAnimationFrame(1500);

      expect(element.scrollLeft).toBeCloseTo(400);
    });

    it("can scroll horizontally backwards", () => {
      const element = document.createElement("div");

      element.scrollLeft = 500;

      scrollToOffset(element, 100, 1000, "horizontal");

      flushAnimationFrame(1500);

      expect(element.scrollLeft).toBeCloseTo(300);

      flushAnimationFrame(2000);

      expect(element.scrollLeft).toBeCloseTo(100);
    });
  });

  describe("animation", () => {
    it("does not change the position at progress 0", () => {
      const element = document.createElement("div");

      element.scrollTop = 100;

      scrollToOffset(element, 500, 1000);

      flushAnimationFrame(1000);

      expect(element.scrollTop).toBeCloseTo(100);
    });

    it("uses ease-in cubic easing during the first half", () => {
      const element = document.createElement("div");

      element.scrollTop = 0;

      scrollToOffset(element, 100, 1000);

      // progress = 0.25
      //
      // eased =
      // 4 * 0.25³
      // = 0.0625
      flushAnimationFrame(1250);

      expect(element.scrollTop).toBeCloseTo(6.25);
    });

    it("maps progress 0.5 to exactly half of the distance", () => {
      const element = document.createElement("div");

      element.scrollTop = 0;

      scrollToOffset(element, 100, 1000);

      flushAnimationFrame(1500);

      expect(element.scrollTop).toBeCloseTo(50);
    });

    it("uses ease-out cubic easing during the second half", () => {
      const element = document.createElement("div");

      element.scrollTop = 0;

      scrollToOffset(element, 100, 1000);

      // progress = 0.75
      //
      // eased =
      // 1 - (-2 * 0.75 + 2)³ / 2
      // = 1 - 0.5³ / 2
      // = 0.9375
      flushAnimationFrame(1750);

      expect(element.scrollTop).toBeCloseTo(93.75);
    });

    it("schedules another frame while animation is not complete", () => {
      const element = document.createElement("div");

      scrollToOffset(element, 100, 1000);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      flushAnimationFrame(1250);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

      flushAnimationFrame(1500);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(3);
    });

    it("stops scheduling frames when animation completes", () => {
      const element = document.createElement("div");

      scrollToOffset(element, 100, 1000);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      flushAnimationFrame(2000);

      expect(element.scrollTop).toBeCloseTo(100);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(animationFrameCallbacks).toHaveLength(0);
    });

    it("clamps progress to 1 when frame time exceeds duration", () => {
      const element = document.createElement("div");

      element.scrollTop = 100;

      scrollToOffset(element, 500, 300);

      flushAnimationFrame(5000);

      expect(element.scrollTop).toBeCloseTo(500);

      expect(animationFrameCallbacks).toHaveLength(0);
    });

    it("reaches the exact target after multiple frames", () => {
      const element = document.createElement("div");

      element.scrollTop = 100;

      scrollToOffset(element, 500, 1000);

      flushAnimationFrame(1250);

      expect(element.scrollTop).toBeCloseTo(125);

      flushAnimationFrame(1500);

      expect(element.scrollTop).toBeCloseTo(300);

      flushAnimationFrame(1750);

      expect(element.scrollTop).toBeCloseTo(475);

      flushAnimationFrame(2000);

      expect(element.scrollTop).toBeCloseTo(500);

      expect(animationFrameCallbacks).toHaveLength(0);
    });
  });

  describe("zero duration", () => {
    it("scrolls immediately without animation frame", () => {
      const element = document.createElement("div");

      element.scrollTop = 100;

      scrollToOffset(element, 500, 0);

      expect(element.scrollTop).toBe(500);
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

    it("scrolls horizontally immediately", () => {
      const element = document.createElement("div");

      element.scrollLeft = 100;

      scrollToOffset(element, 500, 0, "horizontal");

      expect(element.scrollLeft).toBe(500);
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  it("does not modify the other scroll axis", () => {
    const element = document.createElement("div");

    element.scrollTop = 100;
    element.scrollLeft = 200;

    scrollToOffset(element, 500, 300, "vertical");

    flushAnimationFrame(1300);

    expect(element.scrollTop).toBe(500);
    expect(element.scrollLeft).toBe(200);
  });

  it("handles target equal to current position", () => {
    const element = document.createElement("div");

    element.scrollTop = 500;

    scrollToOffset(element, 500, 300);

    flushAnimationFrame(1150);

    expect(element.scrollTop).toBe(500);

    flushAnimationFrame(1300);

    expect(element.scrollTop).toBe(500);
  });
});
