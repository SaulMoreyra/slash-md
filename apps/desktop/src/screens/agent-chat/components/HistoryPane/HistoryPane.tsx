import { Button, Chip } from "@heroui/react";
import { ChatScope } from "@slash-md/agents/types";
import { useTranslation } from "react-i18next";
import { IconChat, IconPlus, IconTrash } from "../../../../components/icons";
import { relativeTime } from "../../../../i18n/relativeTime";
import type { ChatSessionMeta } from "../../../chat/chatStorage";
import { PaneEmpty } from "../../../home/components/PaneEmpty";
import { PaneHeader } from "../../../home/components/PaneHeader";

type Props = {
  sessions: ChatSessionMeta[];
  selectedKey: string | null;
  onNew: () => void;
  onSelect: (contextKey: string) => void;
  onDelete: (contextKey: string) => void;
};

export function HistoryPane({ sessions, selectedKey, onNew, onSelect, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <PaneHeader title={t("home.agentChat.history.title")}>
        <div className="flex flex-row items-center justify-end px-4 pb-2">
          <Button variant="primary" size="sm" onPress={onNew}>
            <IconPlus size={16} />
            {t("home.agentChat.history.new")}
          </Button>
        </div>
      </PaneHeader>
      {sessions.length ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" role="list">
          {sessions.map((session) => (
            <SessionRow
              key={session.contextKey}
              session={session}
              active={session.contextKey === selectedKey}
              onSelect={() => onSelect(session.contextKey)}
              onDelete={() => onDelete(session.contextKey)}
            />
          ))}
        </div>
      ) : (
        <PaneEmpty
          icon={<IconChat />}
          title={t("home.agentChat.history.emptyTitle")}
          body={t("home.agentChat.history.emptyBody")}
        >
          <Button variant="primary" size="sm" onPress={onNew}>
            <IconPlus size={16} />
            {t("home.agentChat.history.new")}
          </Button>
        </PaneEmpty>
      )}
    </>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: ChatSessionMeta;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isFresh = session.turnsCount === 0;
  const title = isFresh ? t("home.agentChat.history.newConversation") : session.title;
  const scopeLabel =
    session.scope === ChatScope.Page
      ? session.path ?? t("home.agentChat.history.page")
      : t("home.agentChat.history.global");

  return (
    <div
      role="listitem"
      className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-2xl px-2.5 py-2 transition-colors ${
        active ? "bg-accent/15" : "hover:bg-default/40"
      }`}
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <Chip size="sm" variant="soft" className="gap-1">
            <Chip.Label className="font-mono text-[10px]">{scopeLabel}</Chip.Label>
          </Chip>
          <span>
            {session.turnsCount} · {relativeTime(session.updatedAt, i18n.language)}
          </span>
        </div>
      </div>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100"
        aria-label={t("home.agentChat.history.delete", { title })}
        onPress={onDelete}
      >
        <IconTrash />
      </Button>
    </div>
  );
}