import { useCallback, useEffect, useState } from "react";

export const CHAT_WIDTH_KEY = "slashmd:chatWidth";
export const CHAT_WIDTH_DEFAULT = 380;
export const CHAT_WIDTH_MIN = 300;
export const CHAT_WIDTH_MAX = 760;
const CHAT_LEAVE_ROOM = 720;

function readStoredWidth(): number {
  try {
    const raw = window.localStorage.getItem(CHAT_WIDTH_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : CHAT_WIDTH_DEFAULT;
  } catch {
    return CHAT_WIDTH_DEFAULT;
  }
}

function writeStoredWidth(width: number): void {
  try {
    window.localStorage.setItem(CHAT_WIDTH_KEY, String(width));
  } catch {
    // storage unavailable: keep the in-memory width
  }
}

function measureMaxWidth(): number {
  const available = window.innerWidth - CHAT_LEAVE_ROOM;
  return Math.max(CHAT_WIDTH_MIN, Math.min(CHAT_WIDTH_MAX, available));
}

function clampWidth(width: number, max: number): number {
  return Math.max(CHAT_WIDTH_MIN, Math.min(max, width));
}

export function useChatDock() {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(readStoredWidth);
  const [maxWidth, setMaxWidth] = useState(measureMaxWidth);

  useEffect(() => {
    const onResize = () => {
      const nextMax = measureMaxWidth();
      setMaxWidth(nextMax);
      setWidth((current) => clampWidth(current, nextMax));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((current) => !current), []);

  const onResize = useCallback(
    (next: number) => setWidth(clampWidth(next, maxWidth)),
    [maxWidth],
  );

  const onCommit = useCallback(
    (next: number) => {
      const clamped = clampWidth(next, maxWidth);
      setWidth(clamped);
      writeStoredWidth(clamped);
    },
    [maxWidth],
  );

  const onReset = useCallback(() => {
    setWidth(CHAT_WIDTH_DEFAULT);
    writeStoredWidth(CHAT_WIDTH_DEFAULT);
  }, []);

  return { open, width, maxWidth, onOpen, onClose, onToggle, onResize, onCommit, onReset };
}
