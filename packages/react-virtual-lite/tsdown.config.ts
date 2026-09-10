import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  // package.json's "main"/exports.require point at dist/index.cjs --
  // esm-only here silently left that file unbuilt, so `require()` broke
  // for CJS consumers despite the package.json promising it worked.
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
});
