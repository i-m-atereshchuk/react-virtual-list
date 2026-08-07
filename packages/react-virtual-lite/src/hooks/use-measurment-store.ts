import { useState } from "react";

import { MeasurementDynamic } from "../utils/MeasurementDynamic";
import { MeasurementStatic } from "../utils/MeasurementStatic";

import { MeasurementStore } from "../utils/MeasurementStore";

import type { SharedProps, Required } from "../types";

type UseMeasurmemtStoreOptions = {
  listSize: number;
  rowSize?: number | undefined;
} & Required<SharedProps, "orientation" | "estimatedRowSize">;

export const useMeasurmemtStore = ({
  listSize,
  rowSize,
  estimatedRowSize,
  orientation,
}: UseMeasurmemtStoreOptions) => {
  const [measurementStore] = useState(() => {
    const measurement =
      typeof rowSize === "number"
        ? new MeasurementStatic(listSize, rowSize)
        : new MeasurementDynamic(listSize, estimatedRowSize);

    return new MeasurementStore(measurement, orientation);
  });

  return measurementStore;
};
