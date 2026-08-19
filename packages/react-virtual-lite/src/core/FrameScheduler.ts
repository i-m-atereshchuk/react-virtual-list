import { type Publisher } from "../types/Publisher";

export class FrameScheduler {
  private frameRef: ReturnType<typeof requestAnimationFrame> | null = null;
  private listeners = new Set<() => void>();
  private publishers: Publisher[];
  private minDirtyPublisherIndex = Infinity;

  version = -1;

  constructor(publishers: Publisher[]) {
    this.publishers = publishers;
    this.subscribe = this.subscribe.bind(this);
    this.getVestion = this.getVestion.bind(this);
    this.flush = this.flush.bind(this);

    for (let i = 0; i < publishers.length; i++) {
      publishers[i].subscribe(() => this.dirtyListener(i));
    }
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

    for (let i = minIndex; i < this.publishers.length; i++) {
      this.publishers[i].calculate();
    }

    this.commint();

    if (this.minDirtyPublisherIndex !== Infinity) {
      this.requestFrame();
    }
  }

  private commint() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  getVestion() {
    return this.version;
  }
}
