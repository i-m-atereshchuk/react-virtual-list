import { type Orientation } from "../types/List";
import { type Measurement } from "../types/Measurement";
import { SizeEstimator } from "../utils/SizeEstimator";
import { ExternalStore } from "./ExternalStore";

export class MeasurementStore extends ExternalStore {
  private measurement: Measurement;
  private observer: ResizeObserver;
  private orientation: Orientation;
  private sizeEstimator: SizeEstimator;

  private pendingSizes = new Map<number, number>();

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
    this.flush = this.flush.bind(this);

    this.observer = new ResizeObserver((entries) => {
      for (const row of entries) {
        const rowIndex = this.nodeIndexMap.get(row.target);

        if (rowIndex === undefined) {
          continue;
        }

        const nextSize =
          this.orientation === "vertical"
            ? row.contentRect.height
            : row.contentRect.width;

        this.pendingSizes.set(rowIndex, nextSize);
      }

      if (this.frameRef === null) {
        this.frameRef = requestAnimationFrame(this.flush);
      }
    });
  }

  private flush() {
    this.frameRef = null;

    const processingSizes = this.pendingSizes;
    this.pendingSizes = new Map<number, number>();

    let changed = false;

    for (const [rowIndex, nextSize] of processingSizes) {
      const rowChanged = this.measurement.setRowSize(rowIndex, nextSize);
      this.sizeEstimator.addSize(nextSize, rowIndex);
      changed = changed || rowChanged;
    }

    if (changed) {
      this.nextVersion();
    }

    if (this.pendingSizes.size > 0 && this.frameRef === null) {
      this.frameRef = requestAnimationFrame(this.flush);
    }
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
    this.observer.disconnect();

    if (this.frameRef !== null) {
      cancelAnimationFrame(this.frameRef);
      this.frameRef = null;
    }

    this.pendingSizes.clear();
    this.nodeIndexMap.clear();
  }
}
