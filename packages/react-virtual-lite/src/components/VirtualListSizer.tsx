import type { Orientation } from "../types/List";

type VirtualListSizerProps = {
  orientation?: Orientation;
  totalSize: number;
};

export function VirtualListSizer({
  orientation = "vertical",
  totalSize,
}: VirtualListSizerProps) {
  return (
    <div
      role="none"
      style={{
        [orientation === "vertical" ? "height" : "width"]: totalSize,
      }}
    />
  );
}
