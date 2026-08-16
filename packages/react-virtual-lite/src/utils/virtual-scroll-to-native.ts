import {
  EDGE_NATIVE_FRACTION,
  EDGE_VIRTUAL_FRACTION,
} from "../constants/scroll";

export function virtualScrollToNative(
  virtual: number,
  maxNative: number,
  maxVirtual: number,
) {
  if (maxNative <= 0 || maxVirtual <= 0) return 0;

  const nativeEdge = maxNative * EDGE_NATIVE_FRACTION;
  const virtualEdge = maxVirtual * EDGE_VIRTUAL_FRACTION;

  const nativeMidStart = nativeEdge;
  const nativeMidEnd = maxNative - nativeEdge;

  const virtualMidStart = virtualEdge;
  const virtualMidEnd = maxVirtual - virtualEdge;

  if (virtual <= virtualMidStart) {
    return virtualEdge > 0 ? (virtual / virtualEdge) * nativeEdge : 0;
  }

  if (virtual >= virtualMidEnd) {
    const t = virtualEdge > 0 ? (virtual - virtualMidEnd) / virtualEdge : 0;

    return nativeMidEnd + t * nativeEdge;
  }

  const midVirtualSpan = virtualMidEnd - virtualMidStart;
  const midNativeSpan = nativeMidEnd - nativeMidStart;

  const t =
    midVirtualSpan > 0 ? (virtual - virtualMidStart) / midVirtualSpan : 0;

  return nativeMidStart + t * midNativeSpan;
}
