import { useCallback, useState } from "react";

export function useEditorChat() {
  const [open, setOpen] = useState(false);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((current) => !current), []);

  return { open, onOpen, onClose, onToggle };
}
