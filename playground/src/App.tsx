import { VirtualList } from "react-virtual-lite";

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

      <VirtualList height={400}>
        {Array.from({ length: 100 }, (_, index) => (
          <div
            key={index}
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              paddingInline: 12,
              borderBottom: "1px solid #eee",
              boxSizing: "border-box",
            }}
          >
            Item {index + 1}
          </div>
        ))}
      </VirtualList>
    </main>
  );
}

export default App;
