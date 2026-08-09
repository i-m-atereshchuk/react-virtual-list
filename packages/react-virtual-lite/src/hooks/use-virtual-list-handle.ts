import {
  useCallback,
  useImperativeHandle,
  type Ref,
  type RefObject,
} from "react";

import type { ScrollBehavior, VirtualListRef } from "../types";

interface UseVirtualListHandleProps {
  ref: Ref<VirtualListRef>;
  containerRef: RefObject<HTMLDivElement | null>;
  orientation: "vertical" | "horizontal";
  listSize: number;
  totalSize: number;
  getOffset: (index: number) => number;
}

export function useVirtualListHandle({
  ref,
  containerRef,
  orientation,
  listSize,
  totalSize,
  getOffset,
}: UseVirtualListHandleProps) {
  const scrollTo = useCallback(
    (offset: number, behavior?: ScrollBehavior) => {
      containerRef.current?.scrollTo({
        [orientation === "horizontal" ? "left" : "top"]: offset,
        behavior: behavior ?? "smooth",
      });
    },
    [containerRef, orientation],
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex(index, behavior) {
        if (index < 0 || index >= listSize) {
          throw new Error(`Index is out of range [0, ${listSize - 1}]`);
        }

        scrollTo(getOffset(index), behavior);
      },

      scrollToOffset(offset, behavior) {
        if (offset < 0 || offset > totalSize) {
          throw new Error(`Offset is out of range [0, ${totalSize}]`);
        }

        scrollTo(offset, behavior);
      },
    }),
    [getOffset, listSize, scrollTo, totalSize],
  );
}
