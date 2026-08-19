import { type Orientation } from "../types/List";
import { type Measurement } from "../types/Measurement";

export class MeasurementStore {
  private measurement: Measurement;
  private observer: ResizeObserver;
  private orientation: Orientation;

  private nodeIndexMap = new Map<Element, number>();

  constructor(measurement: Measurement, orientation: Orientation) {
    this.measurement = measurement;
    this.orientation = orientation;

    this.observeRow = this.observeRow.bind(this);

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

        this.measurement.setRowSize(rowIndex, nextSize);
      }
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

  disconnect() {
    this.observer.disconnect();
    this.nodeIndexMap.clear();
  }
}
