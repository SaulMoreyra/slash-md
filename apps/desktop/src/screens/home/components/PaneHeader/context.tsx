import { createContext, type ReactNode } from "react";

type PaneChromeValue = {
  onClose: () => void;
};

export const PaneChromeContext = createContext<PaneChromeValue | null>(null);

type Props = {
  onClose: () => void;
  children: ReactNode;
};

export function PaneChrome({ onClose, children }: Props) {
  return <PaneChromeContext value={{ onClose }}>{children}</PaneChromeContext>;
}
