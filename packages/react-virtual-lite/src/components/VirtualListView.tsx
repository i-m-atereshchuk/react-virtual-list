import { type CSSProperties, type ReactNode } from "react";

import { MeasureRow } from "./MeasureRow";

import { useMeasurment } from "../hooks/use-measurment";

import { type SharedProps } from "../types";

export interface VirtualListViewProps<T> extends SharedProps {
  list: T[];
  viewPortHeight?: number;
  viewPortWidth?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

export function VirtualListView<T>({
  viewPortHeight = 400,
  viewPortWidth = 400,
  overcast = 3,
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
}: VirtualListViewProps<T>) {
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
  } = useMeasurment({
    listSize: list.length,
    rowSize,
    estimatedRowSize,
    overcast,
    viewPortSize: orientation === "horizontal" ? viewPortWidth : viewPortHeight,
    orientation,
    onVisibleRangeChange,
    remainingItemsThreshold,
    onReachEnd,
    onReachStart,
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
      data-react-virtual-list="list"
      onScroll={(event) => {
        handleScroll(
          orientation === "horizontal"
            ? event.currentTarget.scrollLeft
            : event.currentTarget.scrollTop,
        );
      }}
    >
      {children}
      <div
        style={{
          [orientation === "vertical" ? "height" : "width"]: totalSize,
        }}
      ></div>
    </div>
  );
}
