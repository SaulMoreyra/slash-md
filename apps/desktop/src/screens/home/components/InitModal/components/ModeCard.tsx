import type { ReactNode } from "react";

type Props = {
  selected: boolean;
  icon: ReactNode;
  title: string;
  body: string;
  onSelect: () => void;
};

export function ModeCard({ selected, icon, title, body, onSelect }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[
        "flex flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition-colors",
        selected
          ? "border-accent bg-accent/10 text-foreground"
          : "border-transparent bg-default/40 text-foreground hover:bg-default/70",
      ].join(" ")}
      onClick={onSelect}
    >
      <span className={selected ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted">{body}</span>
    </button>
  );
}
