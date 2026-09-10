---
"react-virtual-lite": patch
---

Fix CJS require() being broken: `format: ["esm"]` in the build config meant `dist/index.cjs` was never actually produced, despite `package.json`'s `main`/`exports.require` pointing at it -- any CommonJS consumer doing `require("react-virtual-lite")` failed outright. The build now also emits a CJS bundle.

Also de-duplicated the Fenwick-tree (Binary Indexed Tree) arithmetic that `MeasurementDynamic` and `MeasurementDynamicLazy` each implemented separately into a shared internal module, shrinking the published ESM bundle slightly (~19.4kB -> ~18.9kB minified). No public API or behavior changes.
