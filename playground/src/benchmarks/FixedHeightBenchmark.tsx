import { useMemo } from "react";
import { VirtualList } from "react-virtual-lite";

declare global {
  interface Window {
    __VIRTUAL_LIST_METRICS__: typeof metrics;
  }
}

const ITEM_COUNT = 50_000;
const ROW_SIZE = 40;

type Item = {
  id: number;
  title: string;
};

const metrics = {
  renderItemCalls: 0,

  reset() {
    this.renderItemCalls = 0;
  },
};

declare global {
  interface Window {
    __VIRTUAL_LIST_METRICS__: typeof metrics;
  }
}

window.__VIRTUAL_LIST_METRICS__ = metrics;

export function FixedHeightBenchmark() {
  const items = useMemo<Item[]>(
    () =>
      Array.from({ length: ITEM_COUNT }, (_, index) => ({
        id: index,
        title: `Item ${index}`,
      })),
    [],
  );

  return (
    <main
      style={{
        width: "100%",
        height: "100vh",
        margin: 0,
        padding: 0,
      }}
    >
      <VirtualList
        list={items}
        rowSize={ROW_SIZE}
        viewPortHeight={600}
        viewPortWidth={800}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => {
          // metrics.renderItemCalls++;

          return (
            <div
              style={{
                height: ROW_SIZE,
                boxSizing: "border-box",
              }}
            >
              {item.title}
            </div>
          );
        }}
      />
    </main>
  );
}
