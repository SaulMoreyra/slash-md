import { useHome } from "../../../home/components/Home/context";
import { Launcher } from "./components/Launcher";
import { Panel } from "./components/Panel";

export function ChatBubble() {
  const { chat } = useHome();
  return (
    <div
      className="app-no-drag fixed bottom-8 right-5 z-40 flex flex-col items-end gap-3"
      data-testid="chat-bubble"
    >
      {chat.open ? <Panel /> : null}
      <Launcher open={chat.open} onToggle={chat.onToggle} />
    </div>
  );
}