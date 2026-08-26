import { Button } from "@heroui/react";
import { IconPlus } from "../../../../../../components/icons";
import { useAddTokenController } from "./hooks/useAddTokenController";

type Props = {
  ariaLabel: string;
  placeholder: string;
  prefix?: string;
  emptyLabel?: string;
  onAdd: (raw: string) => Promise<boolean> | boolean;
  onRemoveLast?: () => void;
};

export function AddToken({ ariaLabel, placeholder, prefix, emptyLabel, onAdd, onRemoveLast }: Props) {
  const { open, value, onOpen, onValueChange, onKeyDown, onBlur } = useAddTokenController({
    onAdd,
    onRemoveLast,
  });

  if (open) {
    return (
      <span className="inline-flex h-6 min-w-24 items-center gap-0.5">
        {prefix ? <span className="text-xs text-muted">{prefix}</span> : null}
        <input
          autoFocus
          aria-label={ariaLabel}
          className="w-28 bg-transparent text-xs text-foreground outline-none placeholder:text-muted/40"
          placeholder={placeholder}
          value={value}
          onChange={(ev) => onValueChange(ev.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 min-h-6 gap-1 rounded-full px-1.5 text-xs text-default-500"
      aria-label={ariaLabel}
      onPress={onOpen}
    >
      <IconPlus size={12} />
      {emptyLabel ? <span>{emptyLabel}</span> : null}
    </Button>
  );
}
