import { Card } from "@heroui/react";
import type { ReactNode } from "react";

type Props = {
  busy: boolean;
  children: ReactNode;
};

export function Frame({ busy, children }: Props) {
  return (
    <Card
      id="home-stage"
      className="flex min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-surface p-0 shadow-none"
      tabIndex={-1}
      aria-busy={busy}
    >
      {children}
    </Card>
  );
}
