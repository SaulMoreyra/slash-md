import { useTranslation } from "react-i18next";
import { ChatRole, TurnStatus } from "../../enums";
import type { ChatTurn } from "../../types";
import { MarkdownText } from "../MarkdownText";
import { ToolTrail } from "./components/ToolTrail";

type Props = {
  turn: ChatTurn;
  onOpenLink: (href: string) => void;
};

export function MessageItem({ turn, onOpenLink }: Props) {
  const { t } = useTranslation();
  const mine = turn.role === ChatRole.User;
  const roleLabel = mine ? t("home.chat.you") : t("home.chat.agent");

  return (
    <article className={mine ? "flex flex-col items-end gap-1" : "flex flex-col gap-1"}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{roleLabel}</span>
      {turn.thinking ? <ThinkingBlock text={turn.thinking} /> : null}
      {turn.tools.length ? <ToolTrail tools={turn.tools} /> : null}
      <div
        className={
          mine
            ? "max-w-[85%] rounded-2xl bg-default/50 px-3 py-2 text-sm"
            : "max-w-full text-sm"
        }
      >
        <MarkdownText text={turn.text} onOpenLink={onOpenLink} />
        {turn.status === TurnStatus.Streaming ? (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-text-bottom" />
        ) : null}
      </div>
      {turn.error ? <p className="text-xs text-danger">{turn.error}</p> : null}
    </article>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <details className="max-w-full text-xs text-muted">
      <summary className="cursor-pointer select-none">{t("home.chat.thinking")}</summary>
      <p className="mt-1 whitespace-pre-wrap">{text}</p>
    </details>
  );
}
