import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import type { SharedProps, VirtualListRef } from "../types/List";
import { VirtualListView } from "./VirtualListView";

export interface VirtualListProps<T> extends SharedProps {
  list: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

type Size = {
  width: number;
  height: number;
};

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: Ref<VirtualListRef>,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;

      setSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }

        return { width, height };
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const isReady = size.width > 0 && size.height > 0 && props.list.length > 0;

  return (
    <div ref={containerRef} style={containerStyle} role="none">
      {isReady && (
        <VirtualListView
          {...props}
          ref={ref}
          viewPortWidth={size.width}
          viewPortHeight={size.height}
        />
      )}
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & {
    ref?: Ref<VirtualListRef>;
  },
) => ReactNode;
