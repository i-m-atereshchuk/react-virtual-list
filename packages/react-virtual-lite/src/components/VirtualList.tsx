import type { CSSProperties, ReactNode } from "react";

import { MeasureRow } from "./MeasureRow";

import { useMeasurment } from "../hooks/use-measurment";

export interface VirtualListProps<T> {
  list: T[];

  viewPortHeight?: number;

  estimatedRowHeight?: number | undefined;

  rowHeight?: number | undefined;

  overcast?: number;

  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

export function VirtualList<T>({
  viewPortHeight = 400,
  overcast = 3,
  list,
  rowHeight,
  estimatedRowHeight = 40,

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
    totalHeight,
    handleHeightChange,
    handleScroll,
    startIndex,
    endIndex,
    containerRef,
  } = useMeasurment({
    listSize: list.length,
    rowHeight,
    estimatedRowHeight,
    overcast,
    viewPortHeight,
  });

  const children: ReactNode[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    const listItem = list[i];

    children.push(
      <MeasureRow
        key={keyExtractor(listItem, i)}
        index={i}
        offsetTop={getOffset(i)}
        onHeightChange={handleHeightChange}
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
      <div style={{ height: totalHeight }}></div>
    </div>
  );
}
