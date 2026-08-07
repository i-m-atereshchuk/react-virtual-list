import type { CSSProperties, ReactNode } from "react";

import { MeasureRow } from "./MeasureRow";

import { useMeasurment } from "../hooks/use-measurment";

import { type SharedProps } from "../types";

export interface VirtualListProps<T> extends SharedProps {
  list: T[];
  viewPortHeight?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

export function VirtualList<T>({
  viewPortHeight = 400,
  overcast = 10,
  list,
  rowSize,
  estimatedRowSize = 40,
  orientation = "vertical",
  keyExtractor,
  renderItem,
}: VirtualListProps<T>) {
  const style: CSSProperties = {
    height: viewPortHeight,
    overflow: "auto",
    border: "1px solid #ccc",
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
    viewPortHeight,
    orientation,
  });

  const children: ReactNode[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    const listItem = list[i];

    children.push(
      <MeasureRow
        key={keyExtractor(listItem, i)}
        index={i}
        offsetTop={getOffset(i)}
        observeRow={observeRow}
      >
        {renderItem(listItem, i)}
      </MeasureRow>,
    );
  }

  return (
    <div
      ref={containerRef}
      style={style}
      data-react-virtual-list=""
      onScroll={(event) => {
        handleScroll(event.currentTarget);
      }}
    >
      {children}
      <div style={{ height: totalSize }}></div>
    </div>
  );
}
