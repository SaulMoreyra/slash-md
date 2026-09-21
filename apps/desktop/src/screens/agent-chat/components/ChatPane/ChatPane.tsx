import { Card } from "@heroui/react";
import { ChatMode } from "@slash-md/agents/types";
import { useTranslation } from "react-i18next";
import { sessionScopeAndPath } from "../../../chat/chatStorage";
import { ChatPanel } from "../../../chat/components/ChatPanel";
import { useHome } from "../../../home/components/Home/context";

export function ChatPane() {
  const { t } = useTranslation();
  const { pageHosts, agentChat } = useHome();

  const attachedKey = agentChat.selectedKey ?? "global";
  const { scope, path } = sessionScopeAndPath(attachedKey);
  const attachedPath = path;

  return (
    <Card
      className="flex h-full w-full flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-surface p-0 shadow-none"
      aria-label={t("home.agentChat.chat.aria")}
    >
      <ChatPanel
        scope={scope}
        mode={ChatMode.Chat}
        path={attachedPath ?? undefined}
        title={t("home.chat.title")}
        storageKey={attachedKey}
        getBuffer={
          attachedPath ? () => pageHosts.get(attachedPath)?.getMarkdown() ?? "" : undefined
        }
        getEditApi={
          attachedPath ? () => pageHosts.get(attachedPath)?.edit ?? null : undefined
        }
      />
    </Card>
  );
}