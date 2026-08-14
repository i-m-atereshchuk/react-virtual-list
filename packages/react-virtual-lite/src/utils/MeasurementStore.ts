import { type Orientation } from "../types/List";
import { type Measurement } from "../types/Measurement";
import { SizeEstimator } from "../utils/SizeEstimator";
import { ExternalStore } from "./ExternalStore";

export class MeasurementStore extends ExternalStore {
  private measurement: Measurement;
  private observer: ResizeObserver;
  private orientation: Orientation;
  private sizeEstimator: SizeEstimator;

  private nodeIndexMap = new Map<Element, number>();
  private frameRef: ReturnType<typeof requestAnimationFrame> | null = null;

  constructor(
    measurement: Measurement,
    orientation: Orientation,
    sizeEstimator: SizeEstimator,
  ) {
    super();
    this.sizeEstimator = sizeEstimator;
    this.measurement = measurement;
    this.orientation = orientation;
    this.observeRow = this.observeRow.bind(this);

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
      this.nextVersion();
    });
  }

  observeRow(row: Element, index: number) {
    this.nodeIndexMap.set(row, index);
    this.observer.observe(row);

    return () => {
      this.observer.unobserve(row);
      this.nodeIndexMap.delete(row);
    };
  }

  getOffset(i: number) {
    return this.measurement.getOffset(i);
  }

  getTotal() {
    return this.measurement.getTotal();
  }

  findNearestIndex(offset: number) {
    return this.measurement.findNearestIndex(offset);
  }

  disconnect() {
    return this.observer.disconnect();
  }
}
