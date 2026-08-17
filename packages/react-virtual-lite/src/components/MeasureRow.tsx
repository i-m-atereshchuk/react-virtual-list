import {
  useRef,
  useLayoutEffect,
  memo,
  type PropsWithChildren,
  type CSSProperties,
} from "react";

import { type Orientation } from "../types/List";

type MeasureRowProps = {
  index: number;
  offset: number;
  observeRow: (element: Element, index: number) => void;
  orientation?: Orientation;
};

function MeasureRowComponent({
  index,
  offset,
  children,
  observeRow,
  orientation = "vertical",
}: PropsWithChildren<MeasureRowProps>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const style: CSSProperties =
    orientation === "vertical"
      ? {
          position: "absolute",
          left: 0,
          right: 0,
          transform: `translateY(${offset}px)`,
        }
      : {
          position: "absolute",
          width: "max-content",
          top: 0,
          bottom: 0,
          transform: `translateX(${offset}px)`,
        };

  useLayoutEffect(() => {
    const measureRow = containerRef.current;

    if (!measureRow) {
      return;
    }

    return observeRow(measureRow, index);
  }, [index]);

  return (
    <div
      ref={containerRef}
      role="none"
      data-virtual-row
      data-testid={`react-virtual-lite-list-item-${index}`}
      data-offset={offset}
      style={style}
    >
      {children}
    </div>
  );
}

export const MeasureRow = memo(MeasureRowComponent);
