import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { applyPageMeasure, clampWidth, edgeMaxWidth, nextWidth, type ResizeEdge } from "../utils";

type Params = {
  width: number;
  containerRef: RefObject<HTMLDivElement | null>;
  onCommit: (width: number) => void;
  onReset: () => void;
};

const CLICK_TOLERANCE_PX = 4;

export function usePageResizeController({ width, containerRef, onCommit, onReset }: Params) {
  const [dragging, setDragging] = useState<ResizeEdge | null>(null);
  const draggingRef = useRef<ResizeEdge | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const currentWidthRef = useRef(width);

  startWidthRef.current = width;

  useEffect(() => {
    if (dragging === null) {
      return;
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") {
        return;
      }
      const el = containerRef.current;
      if (el) {
        applyPageMeasure(el, startWidthRef.current);
      }
      draggingRef.current = null;
      setDragging(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dragging, containerRef]);

  const onPointerDown = useCallback(
    (edge: ResizeEdge) =>
      (ev: ReactPointerEvent<HTMLDivElement>) => {
        ev.preventDefault();
        ev.currentTarget.setPointerCapture?.(ev.pointerId);
        startXRef.current = ev.clientX;
        startWidthRef.current = width;
        currentWidthRef.current = width;
        draggingRef.current = edge;
        setDragging(edge);
      },
    [width],
  );

  const onPointerMove = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>) => {
      const edge = draggingRef.current;
      const el = containerRef.current;
      if (!edge || !el) {
        return;
      }
      const delta = ev.clientX - startXRef.current;
      const max = edgeMaxWidth(el.clientWidth);
      const next = clampWidth(nextWidth(edge, startWidthRef.current, delta), max);
      currentWidthRef.current = next;
      applyPageMeasure(el, next);
    },
    [containerRef],
  );

  const endDrag = useCallback(() => {
    draggingRef.current = null;
    setDragging(null);
  }, []);

  const onPointerUp = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>) => {
      const edge = draggingRef.current;
      if (!edge) {
        return;
      }
      const el = containerRef.current;
      if (el && Math.abs(ev.clientX - startXRef.current) < CLICK_TOLERANCE_PX) {
        endDrag();
        return;
      }
      endDrag();
      onCommit(currentWidthRef.current);
    },
    [containerRef, endDrag, onCommit],
  );

  const onPointerCancel = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      applyPageMeasure(el, startWidthRef.current);
    }
    endDrag();
  }, [containerRef, endDrag]);

  const onDoubleClick = useCallback(() => {
    onReset();
  }, [onReset]);

  const getWellProps = useCallback(
    (edge: ResizeEdge) => ({
      onPointerDown: onPointerDown(edge),
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onDoubleClick,
    }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDoubleClick],
  );

  return {
    dragging,
    getWellProps,
  };
}