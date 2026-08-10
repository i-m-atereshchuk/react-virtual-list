import { type Orientation } from "../types";
import { type Measurement } from "./Measurement";
import { SizeEstimator } from "../utils/SizeEstimator";

export class MeasurementStore {
  private measurement: Measurement;
  private observer: ResizeObserver;
  private orientation: Orientation;
  private sizeEstimator: SizeEstimator;

  private nodeIndexMap = new Map<Element, number>();
  private listeners = new Set<() => void>();
  private frameRef: ReturnType<typeof requestAnimationFrame> | null = null;
  private version = -1;

  constructor(
    measurement: Measurement,
    orientation: Orientation,
    sizeEstimator: SizeEstimator,
  ) {
    this.sizeEstimator = sizeEstimator;
    this.measurement = measurement;
    this.orientation = orientation;

    this.observer = new ResizeObserver((entries) => {
      let changed = false;

      for (const row of entries) {
        const rowIndex = this.nodeIndexMap.get(row.target);

        if (rowIndex === undefined) {
          continue;
        }

        const nextSize =
          this.orientation === "vertical"
            ? row.contentRect.height
            : row.contentRect.width;
        const rowChanged = this.measurement.setRowSize(rowIndex, nextSize);

        this.sizeEstimator.addSize(nextSize, rowIndex);

        changed = changed || rowChanged;
      }

      if (changed) {
        this.scheduleUpdate();
      }
    });
  }

  private scheduleUpdate() {
    if (this.frameRef) {
      return;
    }

    this.frameRef = requestAnimationFrame(() => {
      this.frameRef = null;
      this.version = (this.version + 1) % 2;
      this.listeners.forEach((listener) => listener());
    });
  }

  observeRow = (row: Element, index: number) => {
    this.nodeIndexMap.set(row, index);
    this.observer.observe(row);

    return () => {
      this.observer.unobserve(row);
      this.nodeIndexMap.delete(row);
    };
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  clearAllListeners = () => {
    this.listeners.clear();
  };

  setOrientation = (
    measurement: Measurement,
    nextOrientation: Orientation,
    sizeEstimator: SizeEstimator,
  ) => {
    if (nextOrientation === this.orientation) {
      return;
    }
    this.measurement = measurement;
    this.sizeEstimator = sizeEstimator;
    this.orientation = nextOrientation;

    for (const node of this.nodeIndexMap.keys()) {
      this.observer.unobserve(node);
      this.observer.observe(node);
    }

    this.scheduleUpdate();
  };

  getOffset = (i: number) => this.measurement.getOffset(i);

  getTotal = () => this.measurement.getTotal();

  findNearestIndex = (offset: number) =>
    this.measurement.findNearestIndex(offset);

  getVersion = () => {
    return this.version;
  };

  disconnect = () => {
    this.observer.disconnect();
  };
}
