import { useEffect, useRef, useState } from "react";

function clamp(value: number | null | undefined): number {
  return Math.max(0, Math.min(100, value ?? 0));
}

/**
 * UI-only lagging interpolation for byte-backed native progress.
 * It never advances beyond the latest verified native percentage.
 */
export function useSmoothedUpdateProgress(
  target: number | null | undefined,
  snap = false,
): number {
  const normalized = clamp(target);
  const targetRef = useRef(normalized);
  const [display, setDisplay] = useState(normalized);

  useEffect(() => {
    targetRef.current = normalized;
    if (snap || normalized >= 100) {
      setDisplay(normalized);
      return;
    }
    const timer = window.setInterval(() => {
      setDisplay((current) => {
        const nextTarget = targetRef.current;
        if (current >= nextTarget) return nextTarget;
        const delta = nextTarget - current;
        const step = Math.max(0.2, Math.min(1.4, delta * 0.18));
        return Math.min(nextTarget, current + step);
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [normalized, snap]);

  return snap ? normalized : display;
}
