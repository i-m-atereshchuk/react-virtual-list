import { VirtualList } from "react-virtual-lite";

const data = Array.from({ length: 1000000 }, (_, index) => ({
  title: `Item ${index + 1}`,
  height: Math.floor(Math.random() * 21) + 40, // від 40 до 60 включно
}));

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
        initRowHeight={40}
        list={data}
        renderItem={(item) => {
          return (
            <div
              style={{
                height: item.height,
                display: "flex",
                alignItems: "center",
                paddingInline: 12,
                borderBottom: "1px solid #eee",
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

export default App;
