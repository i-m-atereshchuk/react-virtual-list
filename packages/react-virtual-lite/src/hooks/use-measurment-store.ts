import { useState } from "react";

import { MeasurementDynamic } from "../utils/MeasurementDynamic";
import { MeasurementStatic } from "../utils/MeasurementStatic";

import { MeasurementStore } from "../utils/MeasurementStore";
import { SizeEstimator } from "../utils/SizeEstimator";

import type { SharedProps, Required } from "../types";

type UseMeasurmemtStoreOptions = {
  listSize: number;
  rowSize?: number | undefined;
  estimatedRowSize: number;
} & Required<SharedProps, "orientation" | "estimatedRowSize">;

export const useMeasurmemtStore = ({
  listSize,
  rowSize,
  estimatedRowSize,
  orientation,
}: UseMeasurmemtStoreOptions) => {
  const [sizeEstimator] = useState(new SizeEstimator(estimatedRowSize));
  const [measurementStore] = useState(() => {
    const measurement =
      typeof rowSize === "number"
        ? new MeasurementStatic(listSize, rowSize)
        : new MeasurementDynamic(listSize, estimatedRowSize, sizeEstimator);

    return new MeasurementStore(measurement, orientation, sizeEstimator);
  });

  return measurementStore;
};
