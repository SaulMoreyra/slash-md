import { useTranslation } from "react-i18next";
import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { PublicationRow } from "./PublicationRow";

type Props = {
  pubs: PublicationSummary[];
  busy: boolean;
  onResume: (branch: string) => void;
  onLand: (branch: string) => void;
  onDiscard: (pub: PublicationSummary) => void;
};

export function PublicationList({ pubs, busy, onResume, onLand, onDiscard }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 px-3 pb-3" role="list" aria-label={t("home.publication.others")}>
      {pubs.map((pub) => (
        <div key={pub.branch} role="listitem">
          <PublicationRow pub={pub} busy={busy} onResume={onResume} onLand={onLand} onDiscard={onDiscard} />
        </div>
      ))}
    </div>
  );
}
