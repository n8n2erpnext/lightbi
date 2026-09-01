// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSmoothedUpdateProgress } from "./useSmoothedUpdateProgress";

const Probe = ({ target, snap = false }: { target: number; snap?: boolean }) => {
  const progress = useSmoothedUpdateProgress(target, snap);
  return <span data-testid="progress">{Math.floor(progress)}</span>;
};

describe("useSmoothedUpdateProgress", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("smooths forward jumps without displaying bytes that are not downloaded", () => {
    vi.useFakeTimers();
    const view = render(<Probe target={10} />);
    expect(screen.getByTestId("progress").textContent).toBe("10");
    view.rerender(<Probe target={40} />);
    expect(screen.getByTestId("progress").textContent).toBe("10");

    act(() => vi.advanceTimersByTime(150));
    const middle = Number(screen.getByTestId("progress").textContent);
    expect(middle).toBeGreaterThan(10);
    expect(middle).toBeLessThan(40);

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByTestId("progress").textContent).toBe("40");
  });

  it("snaps to the verified terminal state", () => {
    const view = render(<Probe target={62} />);
    view.rerender(<Probe target={100} snap />);
    expect(screen.getByTestId("progress").textContent).toBe("100");
  });
});
