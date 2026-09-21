import { useHome } from "../../Home/context";
import { HistoryPane } from "../../../../agent-chat/components/HistoryPane";

/** AgentChat history list, wired to the shared selection held by the Home controller. */
export function AgentChatConnected() {
  const { agentChat } = useHome();
  return (
    <HistoryPane
      sessions={agentChat.sessions}
      selectedKey={agentChat.selectedKey}
      onNew={agentChat.onNew}
      onSelect={agentChat.onSelect}
      onDelete={agentChat.onDelete}
    />
  );
}