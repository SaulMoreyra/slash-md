export type ShortcutKbdProps = {
  keys: string;
  className?: string;
};

export function ShortcutKbd({ keys, className }: ShortcutKbdProps) {
  return (
    <span
      aria-hidden
      className={[
        "shrink-0 font-mono text-[11px] tabular-nums tracking-wide text-muted/45",
        "[.button--primary_&]:text-(--accent-foreground)/90",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {keys}
    </span>
  );
}
