import type { CSSProperties, ReactNode } from "react";

export interface VirtualListProps {
  height?: number;
  children?: ReactNode;
}

export function VirtualList({ height = 400, children }: VirtualListProps) {
  const style: CSSProperties = {
    height,
    overflow: "auto",
    border: "1px solid #ccc",
  };

  return (
    <div style={style} data-react-virtual-list="">
      {children}
    </div>
  );
}
