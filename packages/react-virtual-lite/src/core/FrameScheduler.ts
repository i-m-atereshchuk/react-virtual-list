import { type CalculationNode } from "../types/CalculationNode";

export class FrameScheduler {
  private frameRef: ReturnType<typeof requestAnimationFrame> | null = null;
  private listeners = new Set<() => void>();
  private nodeListeners: (() => void)[];
  private nodes: CalculationNode[];
  private minDirtyPublisherIndex = Infinity;

  version = -1;

  constructor(nodes: CalculationNode[]) {
    this.nodes = nodes;
    this.subscribe = this.subscribe.bind(this);
    this.getVersion = this.getVersion.bind(this);
    this.flush = this.flush.bind(this);
    this.connect = this.connect.bind(this);

    this.nodeListeners = Array.from(
      { length: nodes.length },
      (_, index) => () => this.dirtyListener(index),
    );
  }

  private reset() {
    this.minDirtyPublisherIndex = Infinity;
  }

  private dirtyListener(index: number) {
    this.minDirtyPublisherIndex = Math.min(index, this.minDirtyPublisherIndex);
    this.requestFrame();
  }

  private requestFrame() {
    if (this.frameRef !== null) {
      return;
    }

    this.frameRef = requestAnimationFrame(this.flush);
  }

  private flush() {
    this.frameRef = null;
    const minIndex = this.minDirtyPublisherIndex;

    this.reset();

    for (let i = minIndex; i < this.nodes.length; i++) {
      this.nodes[i].calculate();
    }

    this.commit();

    if (this.minDirtyPublisherIndex !== Infinity) {
      this.requestFrame();
    }
  }

  private commit() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  getVersion() {
    return this.version;
  }

  connect() {
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].subscribe(this.nodeListeners[i]);
    }
  }

  disconnect() {
    this.nodes.forEach((node, index) => {
      node.unsubscribe(this.nodeListeners[index]);
    });
  }
}
