import {
  useState,
  useRef,
  useLayoutEffect,
  forwardRef,
  type Ref,
  type CSSProperties,
  type ReactNode,
} from "react";

import { type SharedProps, type VirtualListRef } from "../types";

import { VirtualListView } from "./VirtualListView";

export interface VirtualListProps<T> extends SharedProps {
  list: T[];
  viewPortHeight?: number;
  viewPortWidth?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

const VirtualListInner = <T,>(
  props: VirtualListProps<T>,
  ref: Ref<VirtualListRef>,
) => {
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

  const isReady = size.height > 0 && size.width > 0 && props.list.length > 0;

  return (
    <div ref={divRef} style={style}>
      {isReady && (
        <VirtualListView
          {...props}
          ref={ref}
          viewPortHeight={size.height}
          viewPortWidth={size.width}
        />
      )}
    </div>
  );
};

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: Ref<VirtualListRef> },
) => ReactNode;
