const CENTER = 4_000_000;
const THRESHOLD = 2_000_000;

export type ScrollResult = {
  localScrollTop: number;
  absoluteScrollTop: number;
  rebased: boolean;
};

export class ScrollManager {
  private baseOffset = 0;
  private rebasing = false;

  handleScroll(scrollTop: number): ScrollResult {
    // Ігноруємо штучний scroll після programmatic scrollTop
    if (this.rebasing) {
      this.rebasing = false;

      return {
        localScrollTop: scrollTop,
        absoluteScrollTop: this.baseOffset + scrollTop,
        rebased: false,
      };
    }

    const upper = CENTER + THRESHOLD;
    const lower = CENTER - THRESHOLD;

    if (scrollTop > upper) {
      const delta = scrollTop - CENTER;

      this.baseOffset += delta;
      this.rebasing = true;

      return {
        localScrollTop: CENTER,
        absoluteScrollTop: this.baseOffset + CENTER,
        rebased: true,
      };
    }

    if (scrollTop < lower && this.baseOffset > 0) {
      const delta = Math.min(CENTER - scrollTop, this.baseOffset);

      this.baseOffset -= delta;
      this.rebasing = true;

      return {
        localScrollTop: scrollTop + delta,
        absoluteScrollTop: this.baseOffset + scrollTop + delta,
        rebased: true,
      };
    }

    return {
      localScrollTop: scrollTop,
      absoluteScrollTop: this.baseOffset + scrollTop,
      rebased: false,
    };
  }

  toLocal(absoluteOffset: number) {
    return absoluteOffset - this.baseOffset;
  }
}
