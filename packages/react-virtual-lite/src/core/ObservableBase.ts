export abstract class ObservableBase {
  private listeners = new Set<() => void>();
  protected version = -1;

  subscribe(callback: () => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);
  }

  getVersion(): number {
    return this.version;
  }

  protected nextVersion(): void {
    this.version += 1;
  }

  protected notify(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }
}
