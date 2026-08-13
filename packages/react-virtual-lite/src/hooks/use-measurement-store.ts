import { useState } from "react";

import { MeasurementDynamic } from "../utils/MeasurementDynamic";
import { MeasurementStatic } from "../utils/MeasurementStatic";

import { MeasurementStore } from "../utils/MeasurementStore";
import { SizeEstimator } from "../utils/SizeEstimator";

import type { SharedProps, Required } from "../types/List";

type UseMeasurememtStoreOptions = {
  listSize: number;
  rowSize?: number | undefined;
  estimatedRowSize: number;
} & Required<SharedProps, "orientation" | "estimatedRowSize">;

export const useMeasurementStore = ({
  listSize,
  rowSize,
  estimatedRowSize,
  orientation,
}: UseMeasurememtStoreOptions) => {
  const [measurementStore] = useState(() => {
    const sizeEstimator = new SizeEstimator(rowSize ?? estimatedRowSize);
    const measurement =
      typeof rowSize === "number"
        ? new MeasurementStatic(listSize, rowSize)
        : new MeasurementDynamic(listSize, sizeEstimator);

    return new MeasurementStore(measurement, orientation, sizeEstimator);
  });

  return measurementStore;
};
