# react-virtual-lite

## 2.0.1

### Patch Changes

- 785264f: Improve dynamic-size measurement for very large lists: a new internal Fenwick-tree-based measurement strategy is now used automatically for large lists, materializing only the visible range instead of eagerly allocating arrays sized to the full list. Lists that grow or shrink after mount (e.g. infinite scroll, filtering) now keep their measured offsets and total size correct instead of going stale. No public API changes.

## 2.0.0

### Major Changes

- Rework the imperative scroll API: `scrollToIndex` and `scrollToOffset` on `VirtualListRef` now return `Promise<void>` (resolving once the scroll settles) instead of `void`, and no longer accept a `scrollBehavior` argument — scrolling is always animated. Also adds `onScroll` and `isLoading` props to `VirtualList`.

## 1.0.1

### Patch Changes

- 6dbf45c: Improve package metadata, README documentation, and npm release configuration.

## 1.0.0

### Major Changes

- Initial public release
