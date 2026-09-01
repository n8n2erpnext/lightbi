import React, { useEffect, useMemo, useState } from "react";

const LINE_COUNT = 8;
const LINE_WIDTHS = [36, 36, 36, 24, 36, 24, 24, 24];

type ScrollMinimapProps = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

type ScrollState = {
  canScroll: boolean;
  progress: number;
  viewportRatio: number;
};

export const ScrollMinimap: React.FC<ScrollMinimapProps> = ({ scrollRef }) => {
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScroll: false,
    progress: 0,
    viewportRatio: 1,
  });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
        setScrollState({
          canScroll: maxScroll > 4,
          progress: maxScroll > 0 ? element.scrollTop / maxScroll : 0,
          viewportRatio:
            element.scrollHeight > 0
              ? Math.min(1, element.clientHeight / element.scrollHeight)
              : 1,
        });
      });
    };

    sync();
    element.addEventListener("scroll", sync, { passive: true });
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    resizeObserver?.observe(element);
    if (element.firstElementChild) resizeObserver?.observe(element.firstElementChild);
    const mutationObserver =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(sync);
    mutationObserver?.observe(element, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", sync);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [scrollRef]);

  const activeRange = useMemo(() => {
    const visibleLines = Math.max(
      2,
      Math.min(4, Math.round(scrollState.viewportRatio * LINE_COUNT)),
    );
    const availableStart = Math.max(0, LINE_COUNT - visibleLines);
    const start = Math.round(scrollState.progress * availableStart);
    return { start, end: start + visibleLines - 1 };
  }, [scrollState.progress, scrollState.viewportRatio]);

  if (!scrollState.canScroll) return null;

  const jumpTo = (index: number) => {
    const element = scrollRef.current;
    if (!element) return;
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
    element.scrollTo({
      top: (index / Math.max(1, LINE_COUNT - 1)) * maxScroll,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="pointer-events-auto absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-[14px] md:flex"
      aria-label="Page position"
    >
      {Array.from({ length: LINE_COUNT }, (_, index) => {
        const active = index >= activeRange.start && index <= activeRange.end;
        return (
          <button
            key={index}
            type="button"
            onClick={() => jumpTo(index)}
            aria-label={`Scroll to section ${index + 1}`}
            className={`h-[3px] rounded-full transition-all duration-150 ${
              active ? "bg-black" : "bg-slate-300 hover:bg-slate-400"
            }`}
            style={{ width: LINE_WIDTHS[index] }}
          />
        );
      })}
    </div>
  );
};
