import { useEffect, useState } from "react";

/** How long the exiting panel stays mounted to play the exit animation. */
export const CHAT_BUBBLE_EXIT_MS = 180;

/**
 * Keeps the chat panel mounted after the open flag flips to false so the exit
 * animation can finish before unmounting. `exiting` drives the outward class.
 */
export function useChatBubblePresence(open: boolean, exitMs = CHAT_BUBBLE_EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return undefined;
    }
    if (!mounted) {
      return undefined;
    }
    setExiting(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, exitMs);
    return () => clearTimeout(timer);
  }, [open, mounted, exitMs]);

  return { mounted, exiting };
}