import { useState } from "react";

import Playground from "./examples/Playground";
import { Guardian } from "./examples/Guardian";

import { FixedHeightBenchmark } from "./benchmarks/FixedHeightBenchmark";

const variants = ["Guardian", "Playground"];

function App() {
  const [visibleIndex, setvVsibleIndex] = useState(0);

  const svitch = () => {
    setvVsibleIndex((prev) => (prev + 1) % variants.length);
  };

  const params = new URLSearchParams(window.location.search);
  const benchmark = params.get("benchmark");

  if (benchmark === "fixed") {
    return <FixedHeightBenchmark />;
  }

  return (
    <div>
      <button onClick={svitch}>Swith</button>
      {variants[visibleIndex] === variants[0] && <Guardian />}
      {variants[visibleIndex] === variants[1] && <Playground />}
    </div>
  );

  return <Playground />;
}

export default App;
