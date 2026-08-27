import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconCheckCircle, IconHistory } from "../../../../../components/icons";
import { ShortcutKbd, shortcutLabel } from "../../../../../components/ShortcutKbd";
import { PaneEmpty } from "../../PaneEmpty";

type Props = {
  needsPublication?: boolean;
  onNewPage: () => void;
  onNewPublication?: () => void;
};

export function DraftEmpty({ needsPublication, onNewPage, onNewPublication }: Props) {
  const { t } = useTranslation();

  if (needsPublication) {
    return (
      <PaneEmpty
        icon={<IconHistory size={22} />}
        title={t("home.drafts.emptyNeedsTitle")}
        body={t("home.drafts.emptyNeedsPublication")}
      >
        <Button variant="primary" size="sm" className="gap-2" onPress={onNewPublication}>
          {t("home.publication.new")}
          <ShortcutKbd keys={shortcutLabel.newPage()} />
        </Button>
      </PaneEmpty>
    );
  }

  return (
    <PaneEmpty
      icon={
        <span className="text-(--color-success)">
          <IconCheckCircle size={22} />
        </span>
      }
      title={t("home.drafts.emptyTitle")}
      body={t("home.drafts.emptyBody")}
    >
      <Button variant="primary" size="sm" onPress={onNewPage}>
        {t("home.nav.newPage")}
      </Button>
    </PaneEmpty>
  );
}
