type Props = {
  path: string;
  ariaLabel: string;
};

export function CreateFilePreview({ path, ariaLabel }: Props) {
  return (
    <p className="font-mono text-sm text-muted" aria-label={ariaLabel}>
      {path}
    </p>
  );
}
