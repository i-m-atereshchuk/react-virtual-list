import {
  EDGE_NATIVE_FRACTION,
  EDGE_VIRTUAL_FRACTION,
} from "../constants/scroll";

export function nativeScrollToVirtual(
  native: number,
  maxNative: number,
  maxVirtual: number,
) {
  if (maxNative <= 0 || maxVirtual <= 0) return 0;

  const nativeEdge = maxNative * EDGE_NATIVE_FRACTION;
  const virtualEdge = maxVirtual * EDGE_VIRTUAL_FRACTION;

  const nativeMidStart = nativeEdge;
  const nativeMidEnd = maxNative - nativeEdge;
  const virtuaMidStart = virtualEdge;
  const virtuaMidEnd = maxVirtual - virtualEdge;

  if (native <= nativeMidStart) {
    return nativeEdge > 0 ? (native / nativeEdge) * virtualEdge : 0;
  }

  if (native >= nativeMidEnd) {
    const t = nativeEdge > 0 ? (native - nativeMidEnd) / nativeEdge : 0;
    return virtuaMidEnd + t * virtualEdge;
  }

  const midNativeSpan = nativeMidEnd - nativeMidStart;
  const midVirtualSpan = virtuaMidEnd - virtuaMidStart;
  const t = midNativeSpan > 0 ? (native - nativeMidStart) / midNativeSpan : 0;

  return virtuaMidStart + t * midVirtualSpan;
}
