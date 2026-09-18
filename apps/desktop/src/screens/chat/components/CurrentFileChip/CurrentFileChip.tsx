import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  /** Repo-relative path of the page the chat is attached to; null in global mode. */
  path: string | null;
};

/** The current file selection: shown while the chat reads the page's live buffer. */
export function CurrentFileChip({ path }: Props) {
  const { t } = useTranslation();

  if (!path) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-3 pb-1">
      <Chip
        size="sm"
        variant="soft"
        className="gap-1.5"
        title={t("home.chat.currentFile.live")}
      >
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        <Chip.Label className="font-mono text-xs">{`@${path}`}</Chip.Label>
      </Chip>
    </div>
  );
}