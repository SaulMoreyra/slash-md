import { Card, Chip } from "@heroui/react";
import type { PublicationState } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { publicationChipColor, publicationKindLabel } from "../../../utils";

type Props = {
  publication: PublicationState;
};

export function CurrentPublication({ publication }: Props) {
  const { t } = useTranslation();

  return (
    <Card
      className="mx-3 overflow-hidden rounded-2xl border border-separator bg-default/40 shadow-none"
      aria-current="true"
      aria-label={t("home.publication.current")}
    >
      <Card.Header className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-medium text-muted">{t("home.publication.current")}</p>
          <Card.Title className="min-w-0 truncate text-base" title={publication.title}>
            {publication.title}
          </Card.Title>
        </div>
        <Chip size="sm" variant="soft" color={publicationChipColor(publication.kind)} className="shrink-0">
          <Chip.Label>{publicationKindLabel(t, publication.kind)}</Chip.Label>
        </Chip>
      </Card.Header>
    </Card>
  );
}
