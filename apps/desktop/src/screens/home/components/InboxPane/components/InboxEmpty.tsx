import { useTranslation } from "react-i18next";
import { IconInbox } from "../../../../../components/icons";
import { PaneEmpty } from "../../PaneEmpty";

export function InboxEmpty() {
  const { t } = useTranslation();
  return (
    <PaneEmpty
      icon={<IconInbox size={22} />}
      title={t("home.inbox.emptyTitle")}
      body={t("home.inbox.emptyBody")}
    />
  );
}
