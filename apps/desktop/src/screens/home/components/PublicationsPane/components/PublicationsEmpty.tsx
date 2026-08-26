import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconHistory } from "../../../../../components/icons";
import { ShortcutKbd, shortcutLabel } from "../../../../../components/ShortcutKbd";
import { PaneEmpty } from "../../PaneEmpty";

type Props = {
  onNewPublication: () => void;
};

export function PublicationsEmpty({ onNewPublication }: Props) {
  const { t } = useTranslation();
  return (
    <PaneEmpty
      icon={<IconHistory size={22} />}
      title={t("home.publication.emptyTitle")}
      body={t("home.publication.emptyBody")}
    >
      <Button variant="primary" size="sm" className="gap-2" onPress={onNewPublication}>
        {t("home.publication.new")}
        <ShortcutKbd keys={shortcutLabel.newPage()} />
      </Button>
    </PaneEmpty>
  );
}
