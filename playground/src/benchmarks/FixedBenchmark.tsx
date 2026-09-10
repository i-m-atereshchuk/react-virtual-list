import { VirtualList } from "react-virtual-lite";

import { FIXED_ROW_SIZE, fixedItems } from "./data/fixed-items";
import { useMountMark } from "./use-mount-mark";

const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 800;
const OVERSCAN = 3;

window.__VIRTUAL_LIST_METRICS__ = {
  renderItemCalls: 0,

  reset() {
    this.renderItemCalls = 0;
  },
};

export function FixedBenchmark() {
  useMountMark("fixed");

  return (
    <div
      style={{
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      }}
    >
      <VirtualList
        list={fixedItems}
        rowSize={FIXED_ROW_SIZE}
        overscan={OVERSCAN}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => {
          // Benchmark instrumentation intentionally records render calls.
          // eslint-disable-next-line react-hooks/immutability
          window.__VIRTUAL_LIST_METRICS__.renderItemCalls++;

          return (
            <div
              style={{
                height: FIXED_ROW_SIZE,
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
