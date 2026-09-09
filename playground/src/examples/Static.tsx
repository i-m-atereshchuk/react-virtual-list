import { useState, useRef } from "react";
import { VirtualList, type VirtualListRef } from "react-virtual-lite";

const HORIZONTAL_WIDTH = 150;
const VERTICAL_HEIGHT = 60;
const data = Array.from({ length: 1000000 }, (_, index) => ({
  title: `Item ${index + 1}`,
  height: 38,
  width: HORIZONTAL_WIDTH,
}));

const dataVertical = Array.from({ length: 1000000 }, (_, index) => ({
  title: `Item ${index + 1}`,
  height: VERTICAL_HEIGHT,
}));

const RowItem = ({
  title,
  height,
  width,
}: {
  title: string;
  height: number;
  width: number;
}) => {
  const [containerHeight, setContainerHeight] = useState(height);

  const handleClick = () => {
    setContainerHeight((prev) => (height === prev ? prev + 30 : height));
  };

  return (
    <div
      onClick={handleClick}
      style={{
        height: containerHeight,
        display: "flex",
        alignItems: "center",
        paddingInline: 12,
        borderBottom: "1px solid #eee",
        boxSizing: "border-box",
        width,
      }}
    >
      {title}
    </div>
  );
};

const RowItemVertical = ({
  title,
  height,
  index,
}: {
  title: string;
  height: number;
  index: number;
}) => {
  const [containerHeight, setContainerHeight] = useState(height);

  const handleClick = () => {
    setContainerHeight((prev) => (height === prev ? prev + 30 : height));
  };

  return (
    <div
      onClick={handleClick}
      tabIndex={index}
      role="listitem"
      style={{
        height: containerHeight,
        display: "flex",
        alignItems: "center",
        paddingInline: 12,
        borderBottom: "1px solid #eee",
        boxSizing: "border-box",
        // backgroundColor: 'red'
      }}
    >
      {title}
    </div>
  );
};

let i = 40;

function Static() {
  const verticalRef = useRef<VirtualListRef>(null);

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 20,
        height: 200,
      }}
    >
      <h1>React Virtual List Playground</h1>

      <h1>Horizontal</h1>
      <div
        style={{
          height: 40,
          width: 400,
          border: "1px solid #ccc",
        }}
      >
        <VirtualList
          keyExtractor={(item, index) => `${item.title}_${index}`}
          list={data}
          orientation="horizontal"
          rowSize={HORIZONTAL_WIDTH}
          renderItem={(item) => {
            return (
              <RowItem
                height={item.height}
                title={item.title}
                width={item.width}
              />
            );
          }}
        />
      </div>

      <h1>Vertical</h1>
      <button
        onClick={() => {
          verticalRef.current?.scrollToIndex(i).then(() => {
            i += 40;
          });
          // verticalRef.current?.scrollToOffset(3000);
        }}
      >
        Scroll to index 10
      </button>
      <div
        style={{
          height: 650,
          width: 600,
          border: "1px solid #ccc",
        }}
      >
        <VirtualList
          ref={verticalRef}
          keyExtractor={(item, index) => `${item.title}_${index}`}
          list={dataVertical}
          rowSize={VERTICAL_HEIGHT}
          orientation="vertical"
          renderItem={(item, index) => {
            return (
              <RowItemVertical
                index={index}
                height={item.height}
                title={item.title}
              />
            );
          }}
          // onVisibleRangeChange={(startIndex, endIndex) => {
          //   console.log("onVisibleRangeChange", startIndex, endIndex);
          // }}

          onReachEnd={() => {
            // console.log("onReachEnd");
          }}

          onScroll={() => {
            // console.log("onScroll", event, event.currentTarget.scrollTop);
          }}

          onReachStart={() => {
            // console.log("onReachStart");
          }}
        />
      </div>
    </main>
  );
}

export default Static;
