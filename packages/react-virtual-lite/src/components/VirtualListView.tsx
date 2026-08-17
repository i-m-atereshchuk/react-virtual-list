import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { MeasureRow } from "./MeasureRow";
import { VirtualListSizer } from "./VirtualListSizer";

import { useMeasurement } from "../hooks/use-measurement";
import { useVirtualListHandle } from "../hooks/use-virtual-list-handle";

import { type SharedProps, type VirtualListRef } from "../types/List";

export interface VirtualListViewProps<T> extends SharedProps {
  ref?: Ref<VirtualListRef> | undefined;
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
  const style: CSSProperties = {
    height: viewPortHeight,
    width: viewPortWidth,
    overflow: "auto",
    boxSizing: "border-box",
    position: "relative",
  };

  const {
    getOffset,
    totalSize,
    handleScroll,
    startIndex,
    endIndex,
    containerRef,
    observeRow,
    calculateRenderRange,
  } = useMeasurement({
    listSize: list.length,
    rowSize,
    estimatedRowSize,
    overscan,
    viewPortSize: orientation === "horizontal" ? viewPortWidth : viewPortHeight,
    orientation,
    onVisibleRangeChange,
    remainingItemsThreshold,
    onReachEnd,
    onReachStart,
  });

  useVirtualListHandle({
    ref,
    containerRef,
    orientation,
    listSize: list.length,
    totalSize,
    calculateRenderRange,
  });

  const children: ReactNode[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    const listItem = list[i];

    children.push(
      <MeasureRow
        key={keyExtractor(listItem, i)}
        index={i}
        offset={getOffset(i)}
        observeRow={observeRow}
        orientation={orientation}
      >
        {renderItem(listItem, i)}
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
      onScroll={(event) => {
        handleScroll(
          orientation === "horizontal"
            ? event.currentTarget.scrollLeft
            : event.currentTarget.scrollTop,
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
  props: VirtualListViewProps<T> & { ref?: Ref<VirtualListRef> },
) => ReactNode;
