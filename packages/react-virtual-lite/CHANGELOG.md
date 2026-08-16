# react-virtual-lite

## 2.0.0

### Major Changes

- Rework the imperative scroll API: `scrollToIndex` and `scrollToOffset` on `VirtualListRef` now return `Promise<void>` (resolving once the scroll settles) instead of `void`, and no longer accept a `scrollBehavior` argument — scrolling is always animated. Also adds `onScroll` and `isLoading` props to `VirtualList`.

## 1.0.1

### Patch Changes

- 6dbf45c: Improve package metadata, README documentation, and npm release configuration.

## 1.0.0

### Major Changes

- Initial public release
