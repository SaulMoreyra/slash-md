import { Button } from "@heroui/react";
import type { ReactNode } from "react";

type Props = {
  label: string;
  keys: string;
  onPress: () => void;
  children: ReactNode;
};

export function PaneCloseButton({ label, keys, onPress, children }: Props) {
  return (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      aria-label={`${label} (${keys})`}
      onPress={onPress}
    >
      {children}
    </Button>
  );
}
