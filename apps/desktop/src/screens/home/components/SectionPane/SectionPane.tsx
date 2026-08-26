import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconFolder } from "../../../../components/icons";
import { CreateIntent } from "../../enums";
import { PaneEmpty } from "../PaneEmpty";
import { PaneHeader } from "../PaneHeader";

type Props = {
  title: string;
  hasCover: boolean;
  createIntent?: CreateIntent;
  onWriteCover: () => void;
  onNewPage: () => void;
};

export function SectionPane({
  title,
  hasCover,
  createIntent = CreateIntent.Page,
  onWriteCover,
  onNewPage,
}: Props) {
  const { t } = useTranslation();
  const createLabel =
    createIntent === CreateIntent.Template ? t("home.nav.newTemplate") : t("home.nav.newPage");

  if (hasCover) {
    return (
      <>
        <PaneHeader title={title} />
        <PaneEmpty
          icon={<IconFolder size={22} />}
          title={t("home.section.hasCoverTitle")}
          body={t("home.section.hasCoverBody")}
        >
          <Button variant="primary" size="sm" onPress={onNewPage}>
            {createLabel}
          </Button>
        </PaneEmpty>
      </>
    );
  }

  return (
    <>
      <PaneHeader title={title} />
      <PaneEmpty
        icon={<IconFolder size={22} />}
        title={t("home.section.emptyTitle")}
        body={t("home.section.emptyBody")}
      >
        <Button variant="primary" size="sm" onPress={onWriteCover}>
          {t("home.section.writeCover")}
        </Button>
        <Button variant="ghost" size="sm" onPress={onNewPage}>
          {createLabel}
        </Button>
      </PaneEmpty>
    </>
  );
}
