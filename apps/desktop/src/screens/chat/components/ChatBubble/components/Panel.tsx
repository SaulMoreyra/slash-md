import { Card } from "@heroui/react";
import { ChatMode, ChatScope } from "@slash-md/agents/types";
import { useHome } from "../../../../home/components/Home/context";
import { ChatPanel } from "../../ChatPanel";

export function Panel() {
  const { chat, pagePath, pageHosts } = useHome();
  const attachedPath = pagePath ?? null;

  return (
    <Card className="flex h-[min(34rem,70vh)] w-[26rem] max-w-[calc(100vw-2.5rem)] flex-col gap-0 overflow-hidden rounded-3xl border border-separator bg-surface p-0 shadow-2xl">
      <ChatPanel
        scope={attachedPath ? ChatScope.Page : ChatScope.Global}
        mode={ChatMode.Chat}
        path={attachedPath ?? undefined}
        onClose={chat.onClose}
        getBuffer={
          attachedPath
            ? () => pageHosts.get(attachedPath)?.getMarkdown() ?? ""
            : undefined
        }
        getEditApi={
          attachedPath ? () => pageHosts.get(attachedPath)?.edit ?? null : undefined
        }
        storageKey={attachedPath ? `page:${attachedPath}` : "global"}
      />
    </Card>
  );
}