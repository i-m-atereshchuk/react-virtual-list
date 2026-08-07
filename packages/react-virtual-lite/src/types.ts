export type Orientation = "vertical" | "horizontal";

export type SharedProps = {
  estimatedRowSize?: number | undefined;

  rowSize?: number | undefined;

  overcast?: number;

  orientation?: Orientation;
};

export type Required<T, Keys extends keyof T> = {
  [Key in Keys]-?: T[Key];
};
