import { useCallback, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
  onCommit: (width: number) => void;
  onReset: () => void;
};

export function ChatResizer({ width, min, max, onResize, onCommit, onReset }: Props) {
  const { t } = useTranslation();
  const start = useRef<{ x: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const label = `${t("home.chat.resize")} · ${t("home.chat.resizeReset")}`;

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      start.current = { x: event.clientX, width };
      setDragging(true);
    },
    [width],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!start.current) {
        return;
      }
      const next = Math.max(min, Math.min(max, start.current.width - (event.clientX - start.current.x)));
      onResize(next);
    },
    [min, max, onResize],
  );

  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!start.current) {
        return;
      }
      const next = Math.max(min, Math.min(max, start.current.width - (event.clientX - start.current.x)));
      start.current = null;
      setDragging(false);
      onCommit(next);
    },
    [min, max, onCommit],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      className={`w-1.5 shrink-0 cursor-col-resize touch-none rounded-full transition-colors ${
        dragging ? "bg-accent" : "bg-transparent hover:bg-separator"
      }`}
    />
  );
}
