import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { PublicationCta } from "../../../enums";

type Props = {
  cta: PublicationCta;
  busy?: boolean;
  onReview: () => void;
  onPublish: () => void;
  onLand: () => void;
};

export function PublicationCtaButton({ cta, busy = false, onReview, onPublish, onLand }: Props) {
  const { t } = useTranslation();

  if (cta === PublicationCta.None) {
    return null;
  }

  const spec = {
    [PublicationCta.Send]: { label: t("home.publication.sendReview"), onPress: onReview },
    [PublicationCta.Publish]: { label: t("home.publication.publish"), onPress: onPublish },
    [PublicationCta.Land]: { label: t("home.publication.landWiki"), onPress: onLand },
  }[cta];

  return (
    <Button
      fullWidth
      size="sm"
      variant="primary"
      className="whitespace-normal"
      isDisabled={busy}
      onPress={spec.onPress}
    >
      {spec.label}
    </Button>
  );
}
