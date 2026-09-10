import { VirtualList } from "react-virtual-lite";

import {
  DYNAMIC_SMALL_ESTIMATED_ROW_SIZE,
  dynamicSmallItems,
} from "./data/dynamic-small-items";
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

export function DynamicSmallBenchmark() {
  useMountMark("dynamic-small");

  return (
    <div
      style={{
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      }}
    >
      <VirtualList
        list={dynamicSmallItems}
        estimatedRowSize={DYNAMIC_SMALL_ESTIMATED_ROW_SIZE}
        overscan={OVERSCAN}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => {
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
