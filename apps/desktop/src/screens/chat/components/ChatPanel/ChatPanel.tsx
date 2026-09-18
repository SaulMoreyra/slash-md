import { ChatMode, ChatScope } from "@slash-md/agents/types";
import { useTranslation } from "react-i18next";
import { useChatController } from "../../hooks/useChatController";
import { MessageList } from "../MessageList";
import { ChatHeader } from "./components/ChatHeader";
import { Composer } from "./components/Composer";

export type ChatPanelProps = {
  scope: ChatScope;
  mode: ChatMode;
  path?: string;
  title?: string;
  onClose?: () => void;
  getBuffer?: () => string;
  onEditStart?: () => void;
  onEditStream?: (markdown: string) => void;
  onEditStop?: () => void;
};

export function ChatPanel({
  scope,
  mode,
  path,
  title,
  onClose,
  getBuffer,
  onEditStart,
  onEditStream,
  onEditStop,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const chat = useChatController({
    scope,
    mode,
    path,
    getBuffer,
    onEditStart,
    onEditStream,
    onEditStop,
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ChatHeader
        title={title ?? t("home.chat.title")}
        agents={chat.agents}
        disabled={chat.conversation.streaming}
        canClear={chat.conversation.turns.length > 0 && !chat.conversation.streaming}
        onClear={chat.conversation.onClear}
        onClose={onClose}
      />
      <MessageList turns={chat.conversation.turns} onOpenLink={chat.onOpenLink} />
      <Composer
        composer={chat.composer}
        streaming={chat.conversation.streaming}
        onAbort={chat.conversation.onAbort}
        onRewrite={scope === ChatScope.Page ? chat.rewrite.onRewrite : undefined}
      />
    </div>
  );
}
