---
"react-virtual-lite": patch
---

Micro-optimize listener notification in `CalculateRenderRange` and `FrameScheduler`: replace `Array.prototype.forEach` with a `for...of` loop to avoid the per-call closure/iterator overhead on the hot render-range and frame-commit paths. No behavior or public API changes.
