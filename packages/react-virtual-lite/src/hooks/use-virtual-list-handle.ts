import { useImperativeHandle, type Ref, type RefObject, useRef } from "react";

import type { VirtualListRef } from "../types/List";

import { scrollToOffset } from "../utils/scroll-to-offset";
import { CalculateRenderRange } from "../utils/CalculateRenderRange";

const SCROLL_CORRECTION_MAX = 10;

interface UseVirtualListHandleProps {
  ref: Ref<VirtualListRef>;
  containerRef: RefObject<HTMLDivElement | null>;
  orientation: "vertical" | "horizontal";
  listSize: number;
  totalSize: number;
  calculateRenderRange: CalculateRenderRange;
}

export function useVirtualListHandle({
  ref,
  containerRef,
  orientation,
  listSize,
  totalSize,
  calculateRenderRange,
}: UseVirtualListHandleProps) {
  const scrollOperationId = useRef(0);

  useImperativeHandle(ref, () => {
    const isCanceled = (operationId: number) => {
      return operationId !== scrollOperationId.current;
    };

    const isIndexVisible = (index: number) => {
      const startIndex = calculateRenderRange.getVisibleStartIndex();

      const endIndex = calculateRenderRange.getVisibleEndIndex();

      return index >= startIndex && index <= endIndex;
    };

    const scrollToOffsetByIndex = (
      index: number,
      operationId: number,
    ): Promise<void> => {
      return new Promise((resolve) => {
        let frameId: ReturnType<typeof requestAnimationFrame> | null = null;
        let isCompeted = false;
        let measurementVersion = calculateRenderRange.getMeasurementVersion();
        let scrollCorrectionCount = 0;

        const complete = () => {
          if (isCompeted) {
            return;
          }

          isCompeted = true;

          cleanup();

          resolve();
        };

        const performScroll = () => {
          // debugger;
          if (isCanceled(operationId)) {
            complete();
            return;
          }

          const container = containerRef.current;

          if (!container) {
            complete();
            return;
          }

          measurementVersion = calculateRenderRange.getMeasurementVersion();

          const offset = calculateRenderRange.getScrollOffsetByIndex(index);

          scrollToOffset(container, offset, 0, orientation);

          scheduleCheck();
        };

        const chenck = () => {
          frameId = null;

          if (isCanceled(operationId)) {
            complete();
            return;
          }

          const currentMeasurementVersion =
            calculateRenderRange.getMeasurementVersion();
          const measurementVersionChanged =
            currentMeasurementVersion !== measurementVersion;

          if (!isIndexVisible(index) || measurementVersionChanged) {
            performScroll();
            return;
          }

          if (
            isIndexVisible(index) &&
            scrollCorrectionCount < SCROLL_CORRECTION_MAX
          ) {
            scrollCorrectionCount += 1;
            performScroll();
            return;
          }

          performScroll();

          complete();
        };

        const scheduleCheck = () => {
          if (frameId !== null) {
            cancelAnimationFrame(frameId);
          }

          frameId = requestAnimationFrame(chenck);
        };

        const cleanup = () => {
          calculateRenderRange.unsubscribe(handleChange);

          if (frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
          }
        };

        const handleChange = () => {
          if (isCanceled(operationId)) {
            complete();
            return;
          }

          scheduleCheck();
        };

        calculateRenderRange.subscribe(handleChange);
        performScroll();
      });
    };

    const scrollToGivenOffset = async (offset: number, operationId: number) => {
      while (operationId === scrollOperationId.current) {
        const index = calculateRenderRange.getIndexByOffset(offset);

        await scrollToOffsetByIndex(index, operationId);

        if (isCanceled(operationId)) {
          return;
        }

        const nextIndex = calculateRenderRange.getIndexByOffset(offset);

        if (index !== nextIndex) {
          continue;
        }

        const container = containerRef.current;

        if (!container) {
          return;
        }

        const nativeOffset = calculateRenderRange.getNativeScrollOffset(offset);

        scrollToOffset(container, nativeOffset, 0, orientation);

        await new Promise((resolve) => {
          requestAnimationFrame(resolve);
        });

        return;
      }
    };

    return {
      async scrollToIndex(index) {
        if (index < 0 || index >= listSize) {
          throw new Error(`Index is out of range [0, ${listSize - 1}]`);
        }

        scrollOperationId.current += 1;

        await scrollToOffsetByIndex(index, scrollOperationId.current);
      },

      async scrollToOffset(offset) {
        if (offset < 0 || offset > totalSize) {
          throw new Error(`Offset is out of range [0, ${totalSize}]`);
        }

        scrollOperationId.current += 1;

        await scrollToGivenOffset(offset, scrollOperationId.current);
      },
    };
  }, [calculateRenderRange, listSize, totalSize, orientation]);
}
