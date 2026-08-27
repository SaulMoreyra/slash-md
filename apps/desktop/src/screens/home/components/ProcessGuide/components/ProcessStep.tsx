import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  body: string;
  active?: boolean;
  compact?: boolean;
};

export function ProcessStep({ icon, title, body, active = false, compact = false }: Props) {
  return (
    <li
      className={[
        "flex h-full flex-col items-start rounded-2xl",
        compact ? "gap-2.5 px-4 py-4" : "gap-2 px-3 py-3",
        active ? "border border-accent/40 bg-accent/5" : "bg-default/40",
      ].join(" ")}
    >
      <span className={active ? "text-accent" : "text-muted"} aria-hidden>
        {icon}
      </span>
      <p className="min-h-10 text-sm font-medium leading-snug text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted">{body}</p>
    </li>
  );
}
