import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";

type Props = {
  pub: PublicationSummary;
  className?: string;
};

export function PublicationDraftMeta({ pub, className = "mt-1.5" }: Props) {
  const { t } = useTranslation();
  if (pub.changedFiles == null) {
    return null;
  }

  return (
    <p className={`flex flex-wrap items-center gap-2 text-[11px] tabular-nums text-muted ${className}`}>
      <span>{t("home.publication.filesChanged", { count: pub.changedFiles })}</span>
      {pub.additions ? <span className="text-success">+{pub.additions}</span> : null}
      {pub.deletions ? <span className="text-danger">-{pub.deletions}</span> : null}
    </p>
  );
}
