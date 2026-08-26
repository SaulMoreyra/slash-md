import { useCallback, useState, type KeyboardEvent } from "react";

type Params = {
  onAdd: (raw: string) => Promise<boolean> | boolean;
  onRemoveLast?: () => void;
};

export function useAddTokenController({ onAdd, onRemoveLast }: Params) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const onOpen = useCallback(() => setOpen(true), []);

  const onCancel = useCallback(() => {
    setValue("");
    setOpen(false);
  }, []);

  const onCommit = useCallback(async () => {
    const raw = value.trim();
    if (!raw) {
      setOpen(false);
      return;
    }
    setValue("");
    const ok = await onAdd(raw);
    if (!ok) {
      setValue((current) => current || raw);
    }
  }, [value, onAdd]);

  const onKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        onCancel();
        return;
      }
      if (ev.key === "Enter" || ev.key === ",") {
        ev.preventDefault();
        void onCommit();
        return;
      }
      if (ev.key === "Backspace" && value === "" && onRemoveLast) {
        ev.preventDefault();
        onRemoveLast();
      }
    },
    [onCancel, onCommit, onRemoveLast, value],
  );

  const onBlur = useCallback(() => {
    void onCommit();
  }, [onCommit]);

  return {
    open,
    value,
    onOpen,
    onValueChange: setValue,
    onKeyDown,
    onBlur,
  };
}
