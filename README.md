# React Virtual Lite

A lightweight virtual list component for React. It renders only the visible
items, supports dynamic or fixed row sizes, and can virtualize vertical or
horizontal scroll containers.

## Install

```bash
pnpm add react-virtual-lite
```

```bash
npm install react-virtual-lite
```

## Basic Usage

`VirtualList` fills the size of its parent element, so the parent must have a
real width and height.

```tsx
import { VirtualList } from "react-virtual-lite";

type Row = {
  id: string;
  title: string;
};

const rows: Row[] = Array.from({ length: 10_000 }, (_, index) => ({
  id: String(index),
  title: `Row ${index}`,
}));

export function App() {
  return (
    <div style={{ height: 500, width: "100%" }}>
      <VirtualList
        list={rows}
        keyExtractor={(item) => item.id}
        renderItem={(item) => (
          <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
            {item.title}
          </div>
        )}
      />
    </div>
  );
}
```

## Dynamic Row Size

When `rowSize` is not provided, rows are measured with `ResizeObserver`. Use
`estimatedRowSize` to give the list a good initial estimate before rows are
measured.

```tsx
import { VirtualList } from "react-virtual-lite";

type Message = {
  id: string;
  author: string;
  body: string;
};

export function DynamicRows({ messages }: { messages: Message[] }) {
  return (
    <div style={{ height: 600 }}>
      <VirtualList
        list={messages}
        estimatedRowSize={72}
        overscan={6}
        keyExtractor={(message) => message.id}
        renderItem={(message) => (
          <article
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #ddd",
              lineHeight: 1.5,
            }}
          >
            <strong>{message.author}</strong>
            <p style={{ margin: "8px 0 0" }}>{message.body}</p>
          </article>
        )}
      />
    </div>
  );
}
```

## Static Row Size

Pass `rowSize` when every item has the same size. This avoids relying on
estimated sizes and is the fastest mode for simple lists.

```tsx
import { VirtualList } from "react-virtual-lite";

const users = Array.from({ length: 50_000 }, (_, index) => ({
  id: `user-${index}`,
  name: `User ${index}`,
}));

export function StaticRows() {
  return (
    <div style={{ height: 480 }}>
      <VirtualList
        list={users}
        rowSize={44}
        keyExtractor={(user) => user.id}
        renderItem={(user) => (
          <div
            style={{
              height: 44,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              borderBottom: "1px solid #eee",
              boxSizing: "border-box",
            }}
          >
            {user.name}
          </div>
        )}
      />
    </div>
  );
}
```

## Scroll Orientation

The default orientation is vertical.

```tsx
<div style={{ height: 400 }}>
  <VirtualList
    orientation="vertical"
    list={rows}
    estimatedRowSize={48}
    keyExtractor={(row) => row.id}
    renderItem={(row) => <div style={{ padding: 12 }}>{row.title}</div>}
  />
</div>
```

Use `orientation="horizontal"` for horizontally scrolling content. In
horizontal mode, `rowSize` and `estimatedRowSize` represent item width.

```tsx
import { VirtualList } from "react-virtual-lite";

const cards = Array.from({ length: 1_000 }, (_, index) => ({
  id: `card-${index}`,
  title: `Card ${index}`,
}));

export function HorizontalList() {
  return (
    <div style={{ height: 180, width: "100%" }}>
      <VirtualList
        orientation="horizontal"
        list={cards}
        rowSize={220}
        keyExtractor={(card) => card.id}
        renderItem={(card) => (
          <div
            style={{
              width: 220,
              height: "100%",
              padding: 16,
              borderRight: "1px solid #ddd",
              boxSizing: "border-box",
            }}
          >
            {card.title}
          </div>
        )}
      />
    </div>
  );
}
```

## Imperative Scrolling

Use a ref when you need to scroll programmatically.

```tsx
import { useRef } from "react";
import { VirtualList, type VirtualListRef } from "react-virtual-lite";

export function ScrollControls({ rows }: { rows: { id: string }[] }) {
  const listRef = useRef<VirtualListRef>(null);

  return (
    <>
      <button onClick={() => listRef.current?.scrollToIndex(500, "smooth")}>
        Scroll to row 500
      </button>

      <div style={{ height: 400 }}>
        <VirtualList
          ref={listRef}
          list={rows}
          rowSize={40}
          keyExtractor={(row) => row.id}
          renderItem={(row) => (
            <div style={{ height: 40, padding: "0 12px" }}>{row.id}</div>
          )}
        />
      </div>
    </>
  );
}
```

## Props

| Prop                      | Type                                             | Default      | Description                                                                                                    |
| ------------------------- | ------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `list`                    | `T[]`                                            | Required     | Items to render.                                                                                               |
| `renderItem`              | `(item: T, index: number) => ReactNode`          | Required     | Renders one item.                                                                                              |
| `keyExtractor`            | `(item: T, index: number) => string`             | Required     | Returns a stable key for each item.                                                                            |
| `estimatedRowSize`        | `number`                                         | `40`         | Estimated item size before dynamic rows are measured. Height for vertical lists, width for horizontal lists.   |
| `rowSize`                 | `number`                                         | `undefined`  | Fixed item size. Height for vertical lists, width for horizontal lists. Omit this for dynamic row measurement. |
| `overscan`                | `number`                                         | `3`          | Extra items rendered before and after the visible range.                                                       |
| `orientation`             | `"vertical" \| "horizontal"`                     | `"vertical"` | Scroll direction.                                                                                              |
| `remainingItemsThreshold` | `number`                                         | `3`          | Number of remaining items from an edge before `onReachEnd` or `onReachStart` can fire.                         |
| `onReachEnd`              | `() => void`                                     | `undefined`  | Called when scrolling toward the end and the visible range reaches the end threshold.                          |
| `onReachStart`            | `() => void`                                     | `undefined`  | Called when scrolling toward the start and the visible range reaches the start threshold.                      |
| `onVisibleRangeChange`    | `(startIndex: number, endIndex: number) => void` | `undefined`  | Called when the visible range changes after measurements are available.                                        |

## Ref Methods

| Method           | Type                                                               | Description                                                                          |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `scrollToIndex`  | `(index: number, scrollBehavior?: "smooth" \| "instant") => void`  | Scrolls to the item at `index`. Throws if the index is outside the list range.       |
| `scrollToOffset` | `(offset: number, scrollBehavior?: "smooth" \| "instant") => void` | Scrolls to a native scroll offset. Throws if the offset is outside the scroll range. |

## Notes

- The wrapper around `VirtualList` must have a measurable size.
- Use `rowSize` only when all rendered items have the same size.
- For dynamic rows, set `estimatedRowSize` close to the average item size to
  reduce scroll-position adjustments while rows are being measured.
