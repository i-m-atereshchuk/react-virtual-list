---
"react-virtual-lite": patch
---

Internal rework of `MeasurementDynamic`/`MeasurementDynamicLazy`'s storage, plus a couple of unrelated fixes found along the way. No public API changes.

**Fix CJS `require()` being broken**: `format: ["esm"]` in the build config meant `dist/index.cjs` was never actually produced, despite `package.json`'s `main`/`exports.require` pointing at it -- any CommonJS consumer doing `require("react-virtual-lite")` failed outright. The build now also emits a CJS bundle.

**Store row sizes and offsets in fixed-size chunks instead of one flat array per list.** Previously each row's cumulative offset was tracked individually -- a Fenwick tree (Binary Indexed Tree) sized to the _full list length_, i.e. one entry per row. Rows are now grouped into chunks of 64 (`CHUNK_SIZE`); each chunk keeps its own raw `Int32Array` of row sizes plus a running total, and only the **per-chunk totals** are indexed by the Fenwick tree. Looking up an offset inside a chunk is a short linear scan (at most 64 steps) over that chunk's own sizes instead of a tree read.

Net effect: the Fenwick-indexed structure now has one entry per _chunk_ instead of one per _row_ -- **64x fewer entries**, i.e. ~64x less memory for the offset-tracking structure itself on large lists (e.g. a 1,000,000-row list needs an index sized for ~15,625 chunks instead of 1,000,000 rows). Row sizes themselves are stored as fixed-point integers at 1/64px precision (`SIZE_SCALE = 64`) in typed arrays rather than a plain `number[]`, trading a max ~0.008px per-row rounding step for compact, contiguous, GC-friendly storage.

**De-duplicated the Fenwick-tree (BIT) arithmetic** that `MeasurementDynamic` and `MeasurementDynamicLazy` each implemented separately into a shared internal module (`core/FenwickTree.ts`), and **extracted the chunked storage, offset lookup, and list-growth/truncation logic itself** into a shared `MeasurementChunkedBase` class both now extend, instead of duplicating it.

**Extracted `ObservableBase`**: the `listeners`/`subscribe`/`unsubscribe`/`version`/`notify` bookkeeping duplicated across `MeasurementChunkedBase`, `CalculateRenderRange`, and `FrameScheduler` is now a single shared base class.

Combined effect on the published bundle: `dist/index.mjs` is now ~18.9kB minified / ~5.74kB gzip (up from ~18.5kB / ~5.3kB before this work, due to the added chunk bookkeeping -- offset by the various de-duplications above). Full test suite (443 tests) passes unchanged; behavior is otherwise identical.
