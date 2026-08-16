import { type ExternalStore as IExternalStore } from "../types/ExternalStore";

export class ExternalStore implements IExternalStore {
  private version = 0;
  private listeners = new Set<() => void>();

  constructor() {
    this.getVersion = this.getVersion.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.nextVersion = this.nextVersion.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }

  getVersion(): number {
    return this.version;
  }

  subscribe(listener: () => void): () => boolean {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  unsubscribe(listener: () => void): boolean {
    return this.listeners.delete(listener);
  }

  nextVersion(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }
}
