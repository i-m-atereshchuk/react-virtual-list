import Playground from "./examples/Playground";
import { Guardian } from "./examples/Guardian";
import { FixedHeightBenchmark } from "./benchmarks/FixedHeightBenchmark";

function App() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("benchmark") === "fixed") {
    return <FixedHeightBenchmark />;
  }

  return <Guardian />;

  return <Playground />;
}

export default App;
