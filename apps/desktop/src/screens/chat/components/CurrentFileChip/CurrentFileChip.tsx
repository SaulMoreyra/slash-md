import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  /** Repo-relative path of the page the chat is attached to; null in global mode. */
  path: string | null;
  /** True while an edit session is rewriting this page in live preview. */
  active?: boolean;
};

/** The current file selection: shown while the chat reads the page's live buffer. */
export function CurrentFileChip({ path, active = false }: Props) {
  const { t } = useTranslation();

  if (!path) {
    return null;
  }

  const title = active ? t("home.chat.currentFile.editing") : t("home.chat.currentFile.live");
  const dotClass =
    "size-1.5 rounded-full bg-success " + (active ? "animate-pulse motion-reduce:animate-none" : "");

  return (
    <div className="flex items-center gap-1.5 px-3 pb-1">
      <Chip size="sm" variant="soft" className={active ? "gap-1.5 ring-1 ring-accent/40" : "gap-1.5"} title={title}>
        <span className={dotClass} aria-hidden="true" />
        <Chip.Label className="font-mono text-xs">{`@${path}`}</Chip.Label>
      </Chip>
    </div>
  );
}