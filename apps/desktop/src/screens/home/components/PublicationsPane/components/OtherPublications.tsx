import { useTranslation } from "react-i18next";
import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { PublicationList } from "./PublicationList";

type Props = {
  current: boolean;
  pubs: PublicationSummary[];
  busy: boolean;
  onResume: (branch: string) => void;
};

export function OtherPublications({ current, pubs, busy, onResume }: Props) {
  const { t } = useTranslation();

  if (pubs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {current ? (
        <p className="px-4 text-[11px] font-medium text-muted">{t("home.publication.others")}</p>
      ) : null}
      <PublicationList pubs={pubs} busy={busy} onResume={onResume} />
    </div>
  );
}
