type Props = {
  path: string;
  compact?: boolean;
  ariaLabel: string;
};

export function CreateTargetHeading({ path, compact = false, ariaLabel }: Props) {
  const rest = path === "/" ? "" : path.slice(1);
  return (
    <p
      className={[
        "font-semibold tracking-tight text-muted",
        compact ? "text-2xl" : "text-3xl",
      ].join(" ")}
      aria-label={ariaLabel}
    >
      <span className="text-muted/50">/</span>
      {rest}
    </p>
  );
}
