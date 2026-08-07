import { useState } from "react";
import { VirtualList } from "react-virtual-lite";

const data = Array.from({ length: 1000000 }, (_, index) => ({
  title: `Item ${index + 1}`,
  height: Math.floor(Math.random() * 21) + 40, // від 40 до 60 включно
  // height: 40,
}));

const RowItem = ({ title, height }: { title: string; height: number }) => {
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

function App() {
  return (
    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>React Virtual List Playground</h1>
      <VirtualList
        viewPortHeight={400}
        overcast={30}
        keyExtractor={(item, index) => `${item.title}_${index}`}
        list={data}
        renderItem={(item) => {
          return <RowItem height={item.height} title={item.title} />;
        }}
      />
    </main>
  );
}

export default App;
