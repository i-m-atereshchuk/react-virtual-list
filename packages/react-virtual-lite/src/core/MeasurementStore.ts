import { type Orientation } from "../types/List";
import { type Measurement } from "../types/Measurement";

export class MeasurementStore {
  private measurement: Measurement;
  private observer?: ResizeObserver;
  private orientation: Orientation;
  private rowSize?: number | undefined;

  private nodeIndexMap = new Map<Element, number>();

  constructor(
    measurement: Measurement,
    orientation: Orientation,
    rowSize?: number | undefined,
  ) {
    this.measurement = measurement;
    this.orientation = orientation;
    this.rowSize = rowSize;
    this.observeRow = this.observeRow.bind(this);

    if (typeof rowSize === "number") {
      return;
    }

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
    if (typeof this.rowSize === "number") {
      this.measurement.setRowSize(index, this.rowSize);
      return () => {};
    }

    this.nodeIndexMap.set(row, index);
    this.observer?.observe(row);

    return () => {
      this.observer?.unobserve(row);
      this.nodeIndexMap.delete(row);
    };
  }

  disconnect() {
    this.observer?.disconnect();
    this.nodeIndexMap.clear();
  }
}
