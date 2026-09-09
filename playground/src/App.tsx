import { useState, Suspense, lazy } from "react";

const Guardian = lazy(() =>
  import("./examples/Guardian").then((module) => ({
    default: module.Guardian,
  })),
);
const Playground = lazy(() => import("./examples/Playground"));
const Static = lazy(() => import("./examples/Static"));

const FixedBenchmark = lazy(() =>
  import("./benchmarks/FixedBenchmark").then((module) => ({
    default: module.FixedBenchmark,
  })),
);
const DynamicBenchmark = lazy(() =>
  import("./benchmarks/DynamicBenchmark").then((module) => ({
    default: module.DynamicBenchmark,
  })),
);
const DynamicSmallBenchmark = lazy(() =>
  import("./benchmarks/DynamicSmallBenchmark").then((module) => ({
    default: module.DynamicSmallBenchmark,
  })),
);
const DynamicLazyBenchmark = lazy(() =>
  import("./benchmarks/DynamicLazyBenchmark").then((module) => ({
    default: module.DynamicLazyBenchmark,
  })),
);

const variants = ["Guardian", "Playground", "Static"];

function App() {
  const [visibleIndex, setvVsibleIndex] = useState(1);

  const svitch = (indx: number) => {
    setvVsibleIndex(indx);
  };

  const params = new URLSearchParams(window.location.search);
  const benchmark = params.get("benchmark");

  /*
   * Every route below is lazy-loaded on purpose: each benchmark (and
   * Playground/Static) builds its own item list -- some of them
   * million-row arrays -- at module scope. With plain static imports,
   * ALL of those modules get evaluated on every single page load
   * regardless of which route is actually requested, so every
   * benchmark run silently pays for building every other benchmark's
   * (and example's) data too. Lazy-loading means a route only pays
   * for its own module.
   */

  if (benchmark === "fixed") {
    return (
      <Suspense fallback={null}>
        <FixedBenchmark />
      </Suspense>
    );
  }

  if (benchmark === "dynamic") {
    return (
      <Suspense fallback={null}>
        <DynamicBenchmark />
      </Suspense>
    );
  }

  if (benchmark === "dynamic-small") {
    return (
      <Suspense fallback={null}>
        <DynamicSmallBenchmark />
      </Suspense>
    );
  }

  if (benchmark === "dynamic-lazy") {
    return (
      <Suspense fallback={null}>
        <DynamicLazyBenchmark />
      </Suspense>
    );
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

      <Suspense fallback={null}>
        {variants[visibleIndex] === variants[0] && <Guardian />}
        {variants[visibleIndex] === variants[1] && <Playground />}
        {variants[visibleIndex] === variants[2] && <Static />}
      </Suspense>
    </div>
  );
}

export default App;
