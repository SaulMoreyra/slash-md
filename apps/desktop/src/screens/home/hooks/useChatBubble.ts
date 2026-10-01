import { useCallback, useState } from "react";

/** Ownership of the single floating chat bubble (open/close/toggle only). */
export function useChatBubble() {
  const [open, setOpen] = useState(false);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((current) => !current), []);

  return { open, onOpen, onClose, onToggle };
}

export type ChatApi = ReturnType<typeof useChatBubble>;