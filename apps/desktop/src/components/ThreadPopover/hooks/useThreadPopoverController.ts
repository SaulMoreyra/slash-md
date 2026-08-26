import { useState } from "react";
import type { ReviewThread } from "../../../../shared/api";

type Params = {
  thread: ReviewThread;
  onReply: (body: string) => Promise<void>;
  onResolve: (resolved: boolean) => Promise<void>;
};

export function useThreadPopoverController({ thread, onReply, onResolve }: Params) {
  const [body, setBody] = useState("");

  return {
    body,
    onBodyChange: setBody,
    statusLabelKey: thread.isResolved ? ("thread.resolved" as const) : ("thread.open" as const),
    statusColor: thread.isResolved ? ("success" as const) : ("accent" as const),
    resolveLabelKey: thread.isResolved ? ("thread.unresolve" as const) : ("thread.resolve" as const),
    canSubmitReply: body.trim().length > 0,
    onSubmitReply: async () => {
      await onReply(body);
      setBody("");
    },
    onToggleResolve: () => void onResolve(!thread.isResolved),
  };
}
