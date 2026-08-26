import type { ReactNode } from "react";
import { Description, EmptyState } from "@heroui/react";

type Props = {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
};

export function PaneEmpty({ icon, title, body, children }: Props) {
  return (
    <EmptyState className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-default/50 text-muted" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <Description className="max-w-56 text-sm text-muted">{body}</Description>
      {children ? <div className="mt-1 flex flex-col items-center gap-2">{children}</div> : null}
    </EmptyState>
  );
}
