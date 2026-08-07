import { useState } from "react";

import { MeasurementDynamic } from "../utils/MeasurementDynamic";
import { MeasurementStatic } from "../utils/MeasurementStatic";

import { MeasurementStore } from "../utils/MeasurementStore";

type UseMeasurmemtStoreOptions = {
  estimatedRowHeight?: number | undefined;
  rowHeight?: number | undefined;
  listSize: number;
};

export const useMeasurmemtStore = ({
  estimatedRowHeight,
  rowHeight,
  listSize,
}: UseMeasurmemtStoreOptions) => {
  const [measurementStore] = useState(() => {
    const measurement =
      typeof rowHeight === "number"
        ? new MeasurementStatic(listSize, rowHeight)
        : new MeasurementDynamic(listSize, estimatedRowHeight);

    return new MeasurementStore(measurement);
  });

  return measurementStore;
};
