import {
  useState,
  type CSSProperties,
  type ReactNode,
  useRef,
  useLayoutEffect,
} from "react";

import { type SharedProps } from "../types";

import { VirtualListView } from "./VirtualListView";

export interface VirtualListProps<T> extends SharedProps {
  list: T[];
  viewPortHeight?: number;
  viewPortWidth?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

export const VirtualList = <T,>(props: VirtualListProps<T>) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  const style: CSSProperties = {
    width: "100%",
    height: "100%",
  };

  useLayoutEffect(() => {
    if (!divRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;

      setSize({ width, height });
    });

    observer.observe(divRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={divRef} style={style}>
      {size.height > 0 && size.width > 0 && (
        <VirtualListView
          {...props}
          viewPortHeight={size.height}
          viewPortWidth={size.width}
        />
      )}
    </div>
  );
};
