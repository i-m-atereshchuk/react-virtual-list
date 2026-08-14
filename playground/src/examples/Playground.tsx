import { useState, useRef } from "react";
import { VirtualList, type VirtualListRef } from "react-virtual-lite";

const data = Array.from({ length: 1000000 }, (_, index) => ({
  title: `Item ${index + 1}`,
  width: Math.floor(Math.random() * 21) + 150, // від 40 до 60 включно
  height: 38,
}));

const dataVertical = Array.from({ length: 1000000 }, (_, index) => ({
  title: `Item ${index + 1}`,
  // height: Math.floor(Math.random() * 21) + 60, // від 40 до 60 включно
  height: 50,
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
}: {
  title: string;
  height: number;
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
        // backgroundColor: 'red'
      }}
    >
      {title}
    </div>
  );
};

function Playground() {
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
          verticalRef.current?.scrollToIndex(100);
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
          orientation="vertical"
          renderItem={(item) => {
            return <RowItemVertical height={item.height} title={item.title} />;
          }}
          // onVisibleRangeChange={(startIndex, endIndex) => {
          //   console.log("onVisibleRangeChange", startIndex, endIndex);
          // }}

          onReachEnd={() => {
            console.log("onReachEnd");
          }}

          onReachStart={() => {
            console.log("onReachStart");
          }}
        />
      </div>
    </main>
  );
}

export default Playground;
