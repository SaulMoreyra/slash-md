import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampWidth,
  edgeMaxWidth,
  PAGE_WIDTH_DEFAULT,
  readStoredWidth,
  writeStoredWidth,
} from "../components/PageResizer/utils";

export function usePageWidth() {
  const [width, setWidth] = useState<number>(() => readStoredWidth());
  const [maxWidth, setMaxWidth] = useState(PAGE_WIDTH_DEFAULT);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateContainerWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    setMaxWidth((current) => {
      const next = edgeMaxWidth(el.clientWidth);
      return current === next ? current : next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    updateContainerWidth();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(updateContainerWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateContainerWidth]);

  const onCommit = useCallback((next: number) => {
    const el = containerRef.current;
    const max = el ? edgeMaxWidth(el.clientWidth) : PAGE_WIDTH_DEFAULT;
    const value = clampWidth(next, max);
    writeStoredWidth(value);
    setWidth(value);
  }, []);

  const onReset = useCallback(() => {
    writeStoredWidth(PAGE_WIDTH_DEFAULT);
    setWidth(PAGE_WIDTH_DEFAULT);
  }, []);

  return {
    width,
    maxWidth,
    hasRoom: width <= maxWidth,
    containerRef,
    onCommit,
    onReset,
  };
}

export type PageWidthApi = ReturnType<typeof usePageWidth>;