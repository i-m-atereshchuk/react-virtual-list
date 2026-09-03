import { useState } from "react";

import Playground from "./examples/Playground";
import { Guardian } from "./examples/Guardian";
import Static from "./examples/Static";

import { FixedBenchmark } from "./benchmarks/FixedBenchmark";
import { DynamicBenchmark } from "./benchmarks/DynamicBenchmark";

const variants = ["Guardian", "Playground", "Static"];

function App() {
  const [visibleIndex, setvVsibleIndex] = useState(1);

  const svitch = (indx: number) => {
    setvVsibleIndex(indx);
  };

  const params = new URLSearchParams(window.location.search);
  const benchmark = params.get("benchmark");

  if (benchmark === "fixed") {
    return <FixedBenchmark />;
  }

  if (benchmark === "dynamic") {
    return <DynamicBenchmark />;
  }

  return (
    <div>
      <div>
        {variants.map((item, indx) => (
          <button
            style={visibleIndex === indx ? { backgroundColor: "black" } : {}}
            key={`${indx}`}
            onClick={() => svitch(indx)}
          >
            {item}
          </button>
        ))}
      </div>

      {variants[visibleIndex] === variants[0] && <Guardian />}
      {variants[visibleIndex] === variants[1] && <Playground />}
      {variants[visibleIndex] === variants[2] && <Static />}
    </div>
  );

  return <Playground />;
}

export default App;
