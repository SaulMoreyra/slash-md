import { Chip } from "@heroui/react";
import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { publicationChipColor, publicationKindLabel } from "../../../utils";

type Props = {
  pub: PublicationSummary;
  busy: boolean;
  onResume: (branch: string) => void;
};

export function PublicationRow({ pub, busy, onResume }: Props) {
  const { t } = useTranslation();
  const kindLabel = publicationKindLabel(t, pub.kind);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onResume(pub.branch)}
      aria-label={`${t("home.publication.resume")}: ${pub.title}`}
      className={[
        "flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-separator bg-default/40 px-3 py-3 text-left shadow-none",
        "outline-none transition-colors duration-150 ease-out",
        "hover:bg-default/60",
        "focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "motion-reduce:transition-none",
      ].join(" ")}
    >
      <p className="min-w-0 flex-1 truncate text-sm font-medium" title={pub.title}>
        {pub.title}
      </p>
      <Chip size="sm" variant="soft" color={publicationChipColor(pub.kind)} className="shrink-0">
        <Chip.Label>{kindLabel}</Chip.Label>
      </Chip>
    </button>
  );
}
