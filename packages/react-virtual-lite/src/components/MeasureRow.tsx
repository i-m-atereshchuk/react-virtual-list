import {
  useRef,
  useLayoutEffect,
  memo,
  type PropsWithChildren,
  type CSSProperties,
} from "react";

type MeasureRowProps = {
  index: number;
  offsetTop: number;
  observeRow: (element: Element, index: number) => void;
};

function MeasureRowComponent({
  index,
  offsetTop,
  children,
  observeRow,
}: PropsWithChildren<MeasureRowProps>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    transform: `translateY(${offsetTop}px)`,
  };

  useLayoutEffect(() => {
    const measureRow = containerRef.current;

    if (!measureRow) {
      return;
    }

    return observeRow(measureRow, index);
  }, [index]);

  return (
    <div ref={containerRef} style={style}>
      {children}
    </div>
  );
}

export const MeasureRow = memo(MeasureRowComponent);
