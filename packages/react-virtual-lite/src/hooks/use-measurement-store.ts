import { useState, useEffect, useRef } from "react";

import { MeasurementDynamic } from "../utils/MeasurementDynamic";
import { MeasurementStatic } from "../utils/MeasurementStatic";

import { MeasurementStore } from "../utils/MeasurementStore";
import { SizeEstimator } from "../utils/SizeEstimator";

import type { SharedProps, Required } from "../types";

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
  const prevOrientationRef = useRef(orientation);

  const [measurementStore] = useState(() => {
    const sizeEstimator = new SizeEstimator(rowSize ?? estimatedRowSize);

    const measurement =
      typeof rowSize === "number"
        ? new MeasurementStatic(listSize, rowSize)
        : new MeasurementDynamic(listSize, sizeEstimator);

    return new MeasurementStore(measurement, orientation, sizeEstimator);
  });

  useEffect(() => {
    if (prevOrientationRef.current === orientation) {
      return;
    }

    prevOrientationRef.current = orientation;

    const sizeEstimator = new SizeEstimator(rowSize ?? estimatedRowSize);

    const measurement =
      typeof rowSize === "number"
        ? new MeasurementStatic(listSize, rowSize)
        : new MeasurementDynamic(listSize, sizeEstimator);

    measurementStore.setOrientation(measurement, orientation, sizeEstimator);
  }, [orientation, listSize, rowSize, estimatedRowSize, measurementStore]);

  useEffect(() => {
    return () => {
      measurementStore.disconnect();
      measurementStore.clearAllListeners();
    };
  }, [measurementStore]);

  return measurementStore;
};
