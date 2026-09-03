export function scrollToOffset(
  element: HTMLDivElement,
  target: number,
  duration = 300,
  orientation: "horizontal" | "vertical" = "vertical",
) {
  const prop = orientation === "horizontal" ? "scrollLeft" : "scrollTop";

  if (duration <= 0) {
    element[prop] = target;
    return;
  }

  const start = element[prop];
  const distance = target - start;
  const startTime = performance.now();

  const animate = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);

    const eased =
      progress < 0.5
        ? 4 * progress ** 3
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    element[prop] = start + distance * eased;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
}
