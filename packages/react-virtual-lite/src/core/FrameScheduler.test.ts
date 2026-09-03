import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CalculationNode } from "../types/CalculationNode";

import { FrameScheduler } from "./FrameScheduler";

describe("FrameScheduler", () => {
  let animationFrameCallbacks: Map<number, FrameRequestCallback>;

  let animationFrameId: number;

  beforeEach(() => {
    animationFrameCallbacks = new Map();
    animationFrameId = 0;

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        animationFrameId += 1;

        animationFrameCallbacks.set(animationFrameId, callback);

        return animationFrameId;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const flushAnimationFrame = () => {
    const entry = animationFrameCallbacks.entries().next();

    if (entry.done) {
      throw new Error("No animation frame scheduled");
    }

    const [id, callback] = entry.value;

    animationFrameCallbacks.delete(id);

    callback(performance.now());
  };

  const createNode = (): CalculationNode => {
    return {
      calculate: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
  };

  const getSubscribedListener = (node: CalculationNode): (() => void) => {
    const subscribe = vi.mocked(node.subscribe);

    const callback = subscribe.mock.calls[0]?.[0];

    if (!callback) {
      throw new Error("Node was not subscribed");
    }

    return callback;
  };

  describe("initial state", () => {
    it("starts with version -1", () => {
      const scheduler = new FrameScheduler([]);

      expect(scheduler.getVersion()).toBe(-1);
    });

    it("does not schedule a frame on construction", () => {
      new FrameScheduler([]);

      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe("connect", () => {
    it("subscribes to every node", () => {
      const firstNode = createNode();
      const secondNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode]);

      scheduler.connect();

      expect(firstNode.subscribe).toHaveBeenCalledTimes(1);

      expect(secondNode.subscribe).toHaveBeenCalledTimes(1);
    });

    it("subscribes different listeners to different nodes", () => {
      const firstNode = createNode();
      const secondNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode]);

      scheduler.connect();

      const firstListener = getSubscribedListener(firstNode);

      const secondListener = getSubscribedListener(secondNode);

      expect(firstListener).not.toBe(secondListener);
    });
  });

  describe("disconect", () => {
    it("unsubscribes every node", () => {
      const firstNode = createNode();
      const secondNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode]);

      scheduler.connect();
      scheduler.disconnect();

      const firstListener = getSubscribedListener(firstNode);

      const secondListener = getSubscribedListener(secondNode);

      expect(firstNode.unsubscribe).toHaveBeenCalledWith(firstListener);

      expect(secondNode.unsubscribe).toHaveBeenCalledWith(secondListener);
    });
  });

  describe("dirty nodes", () => {
    it("schedules a frame when a node becomes dirty", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      scheduler.connect();

      const listener = getSubscribedListener(node);

      listener();

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it("does not schedule multiple frames before the current frame flushes", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      scheduler.connect();

      const listener = getSubscribedListener(node);

      listener();
      listener();
      listener();

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it("calculates the dirty node", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      scheduler.connect();

      getSubscribedListener(node)();

      flushAnimationFrame();

      expect(node.calculate).toHaveBeenCalledTimes(1);
    });

    it("calculates all nodes after the first dirty node", () => {
      const firstNode = createNode();
      const secondNode = createNode();
      const thirdNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode, thirdNode]);

      scheduler.connect();

      getSubscribedListener(secondNode)();

      flushAnimationFrame();

      expect(firstNode.calculate).not.toHaveBeenCalled();

      expect(secondNode.calculate).toHaveBeenCalledTimes(1);

      expect(thirdNode.calculate).toHaveBeenCalledTimes(1);
    });

    it("starts calculation from the earliest dirty node", () => {
      const firstNode = createNode();
      const secondNode = createNode();
      const thirdNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode, thirdNode]);

      scheduler.connect();

      getSubscribedListener(thirdNode)();
      getSubscribedListener(firstNode)();

      flushAnimationFrame();

      expect(firstNode.calculate).toHaveBeenCalledTimes(1);

      expect(secondNode.calculate).toHaveBeenCalledTimes(1);

      expect(thirdNode.calculate).toHaveBeenCalledTimes(1);
    });
  });

  describe("commit", () => {
    it("increments version after a frame is flushed", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      scheduler.connect();

      getSubscribedListener(node)();

      expect(scheduler.getVersion()).toBe(-1);

      flushAnimationFrame();

      expect(scheduler.getVersion()).toBe(0);
    });

    it("increments version for every committed frame", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      scheduler.connect();

      const listener = getSubscribedListener(node);

      listener();
      flushAnimationFrame();

      expect(scheduler.getVersion()).toBe(0);

      listener();
      flushAnimationFrame();

      expect(scheduler.getVersion()).toBe(1);
    });

    it("notifies scheduler subscribers after commit", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      const listener = vi.fn();

      scheduler.subscribe(listener);
      scheduler.connect();

      getSubscribedListener(node)();

      flushAnimationFrame();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies all scheduler subscribers", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      const firstListener = vi.fn();
      const secondListener = vi.fn();

      scheduler.subscribe(firstListener);
      scheduler.subscribe(secondListener);

      scheduler.connect();

      getSubscribedListener(node)();

      flushAnimationFrame();

      expect(firstListener).toHaveBeenCalledTimes(1);

      expect(secondListener).toHaveBeenCalledTimes(1);
    });

    it("does not notify an unsubscribed scheduler listener", () => {
      const node = createNode();

      const scheduler = new FrameScheduler([node]);

      const listener = vi.fn();

      const unsubscribe = scheduler.subscribe(listener);

      unsubscribe();

      scheduler.connect();

      getSubscribedListener(node)();

      flushAnimationFrame();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("dirty during flush", () => {
    it("schedules another frame when a node becomes dirty during calculation", () => {
      const firstNode = createNode();
      const secondNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode]);

      scheduler.connect();

      const secondListener = getSubscribedListener(secondNode);

      vi.mocked(firstNode.calculate).mockImplementation(() => {
        secondListener();
      });

      getSubscribedListener(firstNode)();

      flushAnimationFrame();

      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

      expect(animationFrameCallbacks.size).toBe(1);
    });

    it("processes a node dirtied during calculation on the next frame", () => {
      const firstNode = createNode();
      const secondNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode]);

      scheduler.connect();

      const secondListener = getSubscribedListener(secondNode);

      vi.mocked(firstNode.calculate).mockImplementationOnce(() => {
        secondListener();
      });

      getSubscribedListener(firstNode)();

      flushAnimationFrame();

      expect(firstNode.calculate).toHaveBeenCalledTimes(1);

      expect(secondNode.calculate).toHaveBeenCalledTimes(1);

      flushAnimationFrame();

      expect(firstNode.calculate).toHaveBeenCalledTimes(1);

      expect(secondNode.calculate).toHaveBeenCalledTimes(2);
    });

    it("increments version for the additional frame", () => {
      const firstNode = createNode();
      const secondNode = createNode();

      const scheduler = new FrameScheduler([firstNode, secondNode]);

      scheduler.connect();

      const secondListener = getSubscribedListener(secondNode);

      vi.mocked(firstNode.calculate).mockImplementationOnce(() => {
        secondListener();
      });

      getSubscribedListener(firstNode)();

      flushAnimationFrame();

      expect(scheduler.getVersion()).toBe(0);

      flushAnimationFrame();

      expect(scheduler.getVersion()).toBe(1);
    });
  });

  describe("calculation order", () => {
    it("calculates nodes in their original order", () => {
      const calls: number[] = [];

      const firstNode = createNode();
      const secondNode = createNode();
      const thirdNode = createNode();

      vi.mocked(firstNode.calculate).mockImplementation(() => {
        calls.push(0);
      });

      vi.mocked(secondNode.calculate).mockImplementation(() => {
        calls.push(1);
      });

      vi.mocked(thirdNode.calculate).mockImplementation(() => {
        calls.push(2);
      });

      const scheduler = new FrameScheduler([firstNode, secondNode, thirdNode]);

      scheduler.connect();

      getSubscribedListener(firstNode)();

      flushAnimationFrame();

      expect(calls).toEqual([0, 1, 2]);
    });
  });
});
