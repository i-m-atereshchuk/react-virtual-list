import fs from "node:fs";
import path from "node:path";

export function saveBenchmarkResult(scenario: string, result: unknown) {
  const outputDir = process.env.BENCHMARK_OUTPUT_DIR ?? "benchmark-results";

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  fs.writeFileSync(
    path.join(outputDir, `${scenario}.json`),
    JSON.stringify(result, null, 2),
  );
}
