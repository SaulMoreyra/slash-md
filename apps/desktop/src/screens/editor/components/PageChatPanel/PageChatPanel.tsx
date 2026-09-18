import { ChatMode, ChatScope } from "@slash-md/agents/types";
import { useTranslation } from "react-i18next";
import { ChatPanel } from "../../../chat";
import { useEditor } from "../Editor/context";

export function PageChatPanel() {
  const { t } = useTranslation();
  const { page, chat, ai, editor } = useEditor();

  if (!chat.open) {
    return null;
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-separator bg-surface">
      <ChatPanel
        scope={ChatScope.Page}
        mode={ChatMode.Chat}
        path={page.path}
        title={t("editor.aiChat")}
        onClose={chat.onClose}
        getBuffer={editor.getMarkdown}
        onEditStart={ai.start}
        onEditStream={ai.onEditStream}
        onEditStop={ai.stop}
      />
    </aside>
  );
}
