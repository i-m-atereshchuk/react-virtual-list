import type { CSSProperties, ReactNode } from "react";

import { MeasureRow } from "./MeasureRow";

import { useMeasurment } from "../hooks/use-measurment";

export interface VirtualListProps<T> {
  list: T[];
  height?: number;
  children?: ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
  initRowHeight: number;
  overcast?: number;
}

export function VirtualList<T>({
  height = 400,
  overcast = 3,
  list,
  renderItem,
  initRowHeight,
}: VirtualListProps<T>) {
  const style: CSSProperties = {
    height,
    overflow: "auto",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    position: "relative",
  };

  const {
    getOffset,
    totalHeights,
    handleHeightChange,
    handleScroll,
    startIndex,
    endIndex,
  } = useMeasurment({
    listSize: list.length,
    initRowHeight: initRowHeight,
    overcast,
    viewPortHeight: height,
  });

  const children: ReactNode[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    const listItem = list[i];

    children.push(
      <MeasureRow
        key={i.toString()}
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
      style={style}
      data-react-virtual-list=""
      onScroll={(event) => {
        handleScroll(event.currentTarget);
      }}
    >
      {children}
      {totalHeights.map((height, index) => (
        <div key={index} style={{ height: height }}></div>
      ))}
      use-measurment.ts
    </div>
  );
}
