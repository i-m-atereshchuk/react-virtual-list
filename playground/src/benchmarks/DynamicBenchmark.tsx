import { VirtualList } from "react-virtual-lite";

const ITEM_COUNT = 50_000;

const MIN_ROW_SIZE = 30;
const MAX_ROW_SIZE = 50;
const ESTIMATED_ROW_SIZE = 40;

const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 800;

const OVERSCAN = 3;

const items = Array.from({ length: ITEM_COUNT }, (_, index) => ({
  id: index,
  label: `Row ${index}`,
  height: MIN_ROW_SIZE + ((index * 17) % (MAX_ROW_SIZE - MIN_ROW_SIZE + 1)),
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
        estimatedRowSize={ESTIMATED_ROW_SIZE}
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
