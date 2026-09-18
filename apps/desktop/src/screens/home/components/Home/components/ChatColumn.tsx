import { Card } from "@heroui/react";
import { ChatMode, ChatScope } from "@slash-md/agents/types";
import { ChatPanel } from "../../../../chat";
import { CHAT_WIDTH_MIN } from "../../../hooks/useChatDock";
import { ChatResizer } from "../../ChatResizer";
import { useHome } from "../context";

export function ChatColumn() {
  const { chat } = useHome();

  if (!chat.open) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 shrink-0 items-stretch" style={{ width: chat.width }}>
      <ChatResizer
        width={chat.width}
        min={CHAT_WIDTH_MIN}
        max={chat.maxWidth}
        onResize={chat.onResize}
        onCommit={chat.onCommit}
        onReset={chat.onReset}
      />
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-surface p-0 shadow-none">
        <ChatPanel scope={ChatScope.Global} mode={ChatMode.Chat} onClose={chat.onClose} />
      </Card>
    </div>
  );
}
