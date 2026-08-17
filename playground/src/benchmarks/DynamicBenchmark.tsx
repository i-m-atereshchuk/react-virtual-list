import {} from "react";

import { VirtualList } from "react-virtual-lite";

const ITEM_COUNT = 50_000;
const ROW_SIZE = 40;
const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 800;

const items = Array.from({ length: ITEM_COUNT }, (_, index) => ({
  id: index,
  label: `Row ${index}`,
  height: Math.floor(Math.random() * 21) + 60,
}));

window.__VIRTUAL_LIST_METRICS__ = {
  renderItemCalls: 0,

  reset() {
    this.renderItemCalls = 0;
  },
};

export function DynamicBenchmark() {
  return (
    <div
      style={{
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      }}
    >
      <VirtualList
        list={items}
        estimatedRowSize={ROW_SIZE}
        overscan={3}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => {
          // Benchmark instrumentation intentionally records render calls.
          // eslint-disable-next-line react-hooks/immutability
          window.__VIRTUAL_LIST_METRICS__.renderItemCalls++;

          return (
            <div
              style={{
                height: item.height,
                boxSizing: "border-box",
              }}
            >
              {item.label}
            </div>
          );
        }}
      />
    </div>
  );
}
