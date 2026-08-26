import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "danger" | "warning" | "success";
};

const TONE_CLASS = {
  default: "text-foreground",
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
} as const;

export function PrStatusCell({ label, value, icon, tone = "default" }: Props) {
  return (
    <div className="min-w-0 rounded-xl bg-background px-3 py-2">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-medium tabular-nums ${TONE_CLASS[tone]}`}>
        {icon}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}
