---
"react-virtual-lite": patch
---

Improve dynamic-size measurement for very large lists: a new internal Fenwick-tree-based measurement strategy is now used automatically for large lists, materializing only the visible range instead of eagerly allocating arrays sized to the full list. Lists that grow or shrink after mount (e.g. infinite scroll, filtering) now keep their measured offsets and total size correct instead of going stale. No public API changes.
