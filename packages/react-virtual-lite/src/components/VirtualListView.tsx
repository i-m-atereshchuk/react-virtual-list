import {
  useImperativeHandle,
  useCallback,
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { MeasureRow } from "./MeasureRow";

import { useMeasurment } from "../hooks/use-measurment";

import {
  type SharedProps,
  type VirtualListRef,
  type ScrollBehavior,
} from "../types";

export interface VirtualListViewProps<T> extends SharedProps {
  ref?: Ref<VirtualListRef> | undefined;
  list: T[];
  viewPortHeight?: number;
  viewPortWidth?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

function VirtualListViewInnet<T>(
  {
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

  const handleScrollTo = useCallback(
    (itemOffset: number, scrollBehavior?: ScrollBehavior) => {
      const scrollDirection = orientation === "horizontal" ? "left" : "top";

      containerRef.current?.scrollTo({
        [scrollDirection]: itemOffset,
        behavior: scrollBehavior ?? "smooth",
      });
    },
    [orientation, containerRef],
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex(index, scrollBehavior) {
        if (!(index >= 0 && index < list.length)) {
          throw new Error(`Index is out of range [0, ${list.length - 1}]`);
        }

        const itemOffset = getOffset(index);

        handleScrollTo(itemOffset, scrollBehavior);
      },
      scrollToOffset(offset, scrollBehavior) {
        if (!(offset >= 0 && offset <= totalSize)) {
          throw new Error(`Offset is out of range [0, ${totalSize}]`);
        }

        handleScrollTo(offset, scrollBehavior);
      },
    }),
    [getOffset, handleScrollTo, list.length, totalSize],
  );

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

export const VirtualListView = forwardRef(VirtualListViewInnet) as <T>(
  props: VirtualListViewProps<T> & { ref?: Ref<VirtualListRef> },
) => ReactNode;
