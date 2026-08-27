import { Button, Chip } from "@heroui/react";
import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { PublicationKind } from "../../../enums";
import { publicationChipColor, publicationKindLabel } from "../../../utils";
import { PublicationMenu } from "./PublicationMenu";
import { PublicationRowMeta } from "./PublicationRowMeta";

type Props = {
  pub: PublicationSummary;
  busy: boolean;
  onResume: (branch: string) => void;
  onLand: (branch: string) => void;
  onDiscard: (pub: PublicationSummary) => void;
};

export function PublicationRow({ pub, busy, onResume, onLand, onDiscard }: Props) {
  const { t } = useTranslation();
  const kindLabel = publicationKindLabel(t, pub.kind);
  const published = pub.kind === PublicationKind.Published;
  const rowAction = published ? t("home.publication.landWiki") : t("home.publication.resume");

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-separator bg-default/40 pr-1 shadow-none hover:bg-default/60">
      <Button
        fullWidth
        variant="ghost"
        isDisabled={busy}
        onPress={() => (published ? onLand(pub.branch) : onResume(pub.branch))}
        aria-label={`${rowAction}: ${pub.title}`}
        className="h-auto min-w-0 flex-1 flex-col items-stretch justify-start gap-0 rounded-2xl border-0 bg-transparent px-3 py-3 text-left shadow-none"
      >
        <span className="flex w-full items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={pub.title}>
            {pub.title}
          </span>
          <Chip size="sm" variant="soft" color={publicationChipColor(pub.kind)} className="shrink-0">
            <Chip.Label>{kindLabel}</Chip.Label>
          </Chip>
        </span>
        <PublicationRowMeta pub={pub} />
      </Button>
      {published ? null : (
        <PublicationMenu
          title={pub.title}
          branch={pub.branch}
          busy={busy}
          onDiscard={() => onDiscard(pub)}
        />
      )}
    </div>
  );
}
