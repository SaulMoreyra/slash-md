import { useHome } from "../../../home/components/Home/context";
import { Launcher } from "./components/Launcher";
import { Panel } from "./components/Panel";
import { useChatBubblePresence } from "./hooks";

export function ChatBubble() {
  const { chat } = useHome();
  const { mounted, exiting } = useChatBubblePresence(chat.open);
  return (
    <div
      className="app-no-drag fixed bottom-8 right-5 z-40 flex flex-col items-end gap-3"
      data-testid="chat-bubble"
    >
      {mounted ? <Panel exiting={exiting} /> : null}
      <Launcher open={chat.open} onToggle={chat.onToggle} />
    </div>
  );
}