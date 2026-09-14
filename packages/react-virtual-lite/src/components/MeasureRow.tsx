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
  const vertical = orientation === "vertical";

  const style: CSSProperties = {
    position: "absolute",
    transform: `translate${vertical ? "Y" : "X"}(${offset}px)`,
    ...(vertical
      ? { left: 0, right: 0 }
      : { top: 0, bottom: 0, width: "max-content" }),
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
