import {
  forwardRef,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type UIEvent,
} from "react";

import { MeasureRow } from "./MeasureRow";
import { VirtualListSizer } from "./VirtualListSizer";

import { useVirtualListHandle } from "../hooks/use-virtual-list-handle";
import { useVirtualized } from "../hooks/use-virtualized";

import type { SharedProps, VirtualListRef } from "../types/List";

export interface VirtualListViewProps<T> extends SharedProps {
  list: T[];
  viewPortHeight?: number;
  viewPortWidth?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

function VirtualListViewInner<T>(
  {
    viewPortHeight = 400,
    viewPortWidth = 400,
    overscan = 3,
    list,
    rowSize,
    estimatedRowSize = 40,
    orientation = "vertical",
    keyExtractor,
    renderItem,
    remainingItemsThreshold = 3,
    onVisibleRangeChange,
    onReachEnd,
    onReachStart,
    onScroll,
    isLoading = false,
  }: VirtualListViewProps<T>,
  ref: Ref<VirtualListRef>,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  const viewPortSize =
    orientation === "horizontal" ? viewPortWidth : viewPortHeight;

  const style = useMemo<CSSProperties>(
    () => ({
      height: viewPortHeight,
      width: viewPortWidth,
      overflow: "auto",
      boxSizing: "border-box",
      position: "relative",
    }),
    [viewPortHeight, viewPortWidth],
  );

  const {
    renderRange,
    observeRow,
    getOffset,
    totalSize,
    handleScroll,
    startIndex,
    endIndex,
  } = useVirtualized({
    rowSize,
    listSize: list.length,
    estimatedRowSize,
    orientation,
    viewPortSize,
    overscan,
    onReachEnd,
    onReachStart,
    onVisibleRangeChange,
    remainingItemsThreshold,
  });

  useVirtualListHandle({
    ref,
    containerRef,
    orientation,
    listSize: list.length,
    totalSize,
    calculateRenderRange: renderRange,
  });

  const children: ReactNode[] = [];

  for (let index = startIndex; index < endIndex; index++) {
    const item = list[index];

    if (item === undefined) {
      continue;
    }

    children.push(
      <MeasureRow
        key={keyExtractor(item, index)}
        index={index}
        offset={getOffset(index)}
        observeRow={observeRow}
        orientation={orientation}
      >
        {renderItem(item, index)}
      </MeasureRow>,
    );
  }

  return (
    <div
      ref={containerRef}
      style={style}
      data-testid="react-virtual-lite"
      data-react-virtual-list="list"
      role="list"
      aria-busy={isLoading}
      onScroll={(event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;

        handleScroll(
          orientation === "horizontal" ? target.scrollLeft : target.scrollTop,
        );

        onScroll?.(event);
      }}
    >
      {children}

      <VirtualListSizer totalSize={totalSize} orientation={orientation} />
    </div>
  );
}

export const VirtualListView = forwardRef(VirtualListViewInner) as <T>(
  props: VirtualListViewProps<T> & {
    ref?: Ref<VirtualListRef>;
  },
) => ReactNode;
