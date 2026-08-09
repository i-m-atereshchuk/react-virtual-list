export type Orientation = "vertical" | "horizontal";
export type ScrollBehavior = "smooth" | "instant";

export type SharedProps = {
  estimatedRowSize?: number | undefined;

  rowSize?: number | undefined;

  overcast?: number;

  orientation?: Orientation;

  remainingItemsThreshold?: number;

  onReachEnd?: (() => void) | undefined;
  onReachStart?: (() => void) | undefined;
  onVisibleRangeChange?:
    ((startIndex: number, endIndex: number) => void) | undefined;
};

export type Required<T, Keys extends keyof T> = {
  [Key in Keys]-?: T[Key];
};

export type VirtualListRef = {
  scrollToIndex: (index: number, scrollBehavior?: ScrollBehavior) => void;
  scrollToOffset: (offset: number, scrollBehavior?: ScrollBehavior) => void;
};
