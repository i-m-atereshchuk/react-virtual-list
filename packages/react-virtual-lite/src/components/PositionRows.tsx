import { type PropsWithChildren, type CSSProperties } from "react";
import { type Orientation } from "../types";

type PositionRowsProps = {
  offset: number;
  orientation: Orientation;
};

export function PositionRows({
  offset,
  orientation,
  children,
}: PropsWithChildren<PositionRowsProps>) {
  const isHorizontal = orientation === "horizontal";
  const translate = `translate${isHorizontal ? "X" : "Y"}(${offset}px)`;

  const verticalStyle: CSSProperties = {
    left: 0,
    right: 0,
  };
  const horizontalStyle: CSSProperties = {
    top: 0,
    bottom: 0,
    width: "max-content",
    display: "flex",
    flexDirection: "row",
  };

  const style: CSSProperties = {
    position: "absolute",
    ...(isHorizontal ? horizontalStyle : verticalStyle),
    transform: translate,
  };
  return (
    <div style={style} role="list">
      {children}
    </div>
  );
}
