import { useState } from "react";

import Playground from "./examples/Playground";
import { Guardian } from "./examples/Guardian";

const variants = ["Guardian", "Playground"];

function App() {
  const [visibleIndex, setvVsibleIndex] = useState(0);

  const svitch = () => {
    setvVsibleIndex((prev) => (prev + 1) % variants.length);
  };

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
