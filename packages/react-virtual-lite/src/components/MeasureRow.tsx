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
  onHeightChange: (height: number, index: number) => void;
};

function MeasureRowComponent({
  index,
  offsetTop,
  onHeightChange,
  children,
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

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const rowHeight = entry.contentRect.height;

      onHeightChange(rowHeight, index);
    });

    observer.observe(measureRow);

    return () => observer.disconnect();
  }, [index, onHeightChange]);

  return (
    <div ref={containerRef} style={style}>
      {children}
    </div>
  );
}

export const MeasureRow = memo(MeasureRowComponent);
