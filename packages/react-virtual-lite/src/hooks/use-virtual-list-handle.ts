import { useImperativeHandle, type Ref, type RefObject } from "react";

import type { VirtualListRef } from "../types/List";

import { scrollToOffset } from "../utils/scroll-to-offset";
import { CalculateRenderRange } from "../utils/CalculateRenderRange";

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
  useImperativeHandle(
    ref,
    () => ({
      async scrollToIndex(index) {
        if (index < 0 || index >= listSize) {
          throw new Error(`Index is out of range [0, ${listSize - 1}]`);
        }
        const startVisibleIndex = calculateRenderRange.getVisibleStartIndex();
        const endVisibleIndex = calculateRenderRange.getVisibleEndIndex();

        if (endVisibleIndex === listSize || startVisibleIndex === index - 1) {
          return;
        }

        const scroll = () => {
          const container = containerRef.current;

          if (!container) {
            return;
          }
          const currentOffset =
            calculateRenderRange.getScrollOffsetByIndex(index);
          console.log("scroll", currentOffset);
          scrollToOffset(container, currentOffset, 0, orientation);
        };

        const listener = () => {
          const startVisibleIndex = calculateRenderRange.getVisibleStartIndex();
          const endVisibleIndex = calculateRenderRange.getVisibleEndIndex();
          console.log("endVisibleIndex", endVisibleIndex);

          if (endVisibleIndex === listSize || startVisibleIndex === index - 1) {
            console.log("unsubscribe ", endVisibleIndex);
            requestAnimationFrame(scroll);
            calculateRenderRange.unsubscribe(listener);
            return;
          }

          requestAnimationFrame(scroll);
        };

        calculateRenderRange.subscribe(listener);
        requestAnimationFrame(scroll);

        throw new Error("COMPLETE IMPLE");
      },

      async scrollToOffset(offset) {
        if (offset < 0 || offset > totalSize) {
          throw new Error(`Offset is out of range [0, ${totalSize}]`);
        }

        if (containerRef.current) {
          scrollToOffset(containerRef.current, offset, 300, orientation);
        }
      },
    }),
    [calculateRenderRange, listSize, scrollTo, totalSize, orientation],
  );
}
