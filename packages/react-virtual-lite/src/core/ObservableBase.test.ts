import { describe, expect, it, vi } from "vitest";
import { ObservableBase } from "./ObservableBase";

class TestObservableBase extends ObservableBase {
  emit(): void {
    this.notify();
  }

  incrementVersion(): void {
    this.nextVersion();
  }
}

describe("ObservableBase", () => {
  describe("subscriptions", () => {
    it("notifies subscribed listeners", () => {
      const observable = new TestObservableBase();
      const listener = vi.fn();

      observable.subscribe(listener);

      observable.emit();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies all subscribed listeners", () => {
      const observable = new TestObservableBase();
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      observable.subscribe(listenerA);
      observable.subscribe(listenerB);

      observable.emit();

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it("notifies listeners on every notification", () => {
      const observable = new TestObservableBase();
      const listener = vi.fn();

      observable.subscribe(listener);

      observable.emit();
      observable.emit();

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("does not notify an unsubscribed listener", () => {
      const observable = new TestObservableBase();
      const listener = vi.fn();

      observable.subscribe(listener);
      observable.unsubscribe(listener);

      observable.emit();

      expect(listener).not.toHaveBeenCalled();
    });

    it("only unsubscribes the specified listener", () => {
      const observable = new TestObservableBase();
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      observable.subscribe(listenerA);
      observable.subscribe(listenerB);

      observable.unsubscribe(listenerA);

      observable.emit();

      expect(listenerA).not.toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it("does not subscribe the same callback more than once", () => {
      const observable = new TestObservableBase();
      const listener = vi.fn();

      observable.subscribe(listener);
      observable.subscribe(listener);

      observable.emit();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("allows a listener to subscribe again after being unsubscribed", () => {
      const observable = new TestObservableBase();
      const listener = vi.fn();

      observable.subscribe(listener);
      observable.unsubscribe(listener);
      observable.subscribe(listener);

      observable.emit();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does nothing when unsubscribing a callback that is not subscribed", () => {
      const observable = new TestObservableBase();
      const listener = vi.fn();

      expect(() => {
        observable.unsubscribe(listener);
      }).not.toThrow();
    });

    it("does nothing when there are no listeners", () => {
      const observable = new TestObservableBase();

      expect(() => {
        observable.emit();
      }).not.toThrow();
    });
  });

  describe("version", () => {
    it("starts with version -1", () => {
      const observable = new TestObservableBase();

      expect(observable.getVersion()).toBe(-1);
    });

    it("increments the version", () => {
      const observable = new TestObservableBase();

      observable.incrementVersion();

      expect(observable.getVersion()).toBe(0);
    });

    it("increments the version on every call", () => {
      const observable = new TestObservableBase();

      observable.incrementVersion();
      observable.incrementVersion();
      observable.incrementVersion();

      expect(observable.getVersion()).toBe(2);
    });

    it("does not change the version when notifying listeners", () => {
      const observable = new TestObservableBase();

      observable.emit();

      expect(observable.getVersion()).toBe(-1);
    });

    it("does not notify listeners when only incrementing the version", () => {
      const observable = new TestObservableBase();
      const listener = vi.fn();

      observable.subscribe(listener);

      observable.incrementVersion();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
