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
    <div className="flex h-full min-h-0 shrink-0 items-stretch gap-1" style={{ width: chat.width }}>
      <ChatResizer
        width={chat.width}
        min={CHAT_WIDTH_MIN}
        max={chat.maxWidth}
        onResize={chat.onResize}
        onCommit={chat.onCommit}
        onReset={chat.onReset}
      />
      <div className="min-w-0 flex-1">
        <ChatPanel scope={ChatScope.Global} mode={ChatMode.Chat} onClose={chat.onClose} />
      </div>
    </div>
  );
}
