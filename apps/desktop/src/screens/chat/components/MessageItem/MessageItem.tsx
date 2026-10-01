import { Chip } from "@heroui/react";
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
    <article
      className={
        "flex flex-col gap-1 " +
        (mine ? "items-end animate-pop-in motion-reduce:animate-none" : "animate-rise motion-reduce:animate-none")
      }
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{roleLabel}</span>
      {turn.thinking ? <ThinkingBlock text={turn.thinking} /> : null}
      {turn.tools.length ? <ToolTrail tools={turn.tools} /> : null}
      {turn.edit ? (
        <EditStatus turn={turn} />
      ) : (
        <div
          className={
            mine ? "max-w-[85%] rounded-2xl bg-default/50 px-3 py-2 text-sm" : "max-w-full text-sm"
          }
        >
          {turn.text ? (
            <MarkdownText text={turn.text} onOpenLink={onOpenLink} />
          ) : turn.status === TurnStatus.Streaming ? (
            <TypingDots />
          ) : null}
          {turn.status === TurnStatus.Streaming && turn.text ? (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-blink bg-accent motion-reduce:animate-none align-text-bottom" />
          ) : null}
        </div>
      )}
      {turn.error ? <p className="text-xs text-danger">{turn.error}</p> : null}
    </article>
  );
}

/** Compact status for page-rewrite turns: the live preview lives in the editor. */
function EditStatus({ turn }: { turn: ChatTurn }) {
  const { t } = useTranslation();

  if (turn.status === TurnStatus.Streaming) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted">
        <TypingDots />
        <span>{t("home.chat.editingPage")}</span>
      </div>
    );
  }

  if (turn.status === TurnStatus.Done) {
    return (
      <Chip size="sm" variant="soft" color="accent">
        <Chip.Label>{t("home.chat.edited")}</Chip.Label>
      </Chip>
    );
  }

  return null;
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

function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-dot rounded-full bg-accent motion-reduce:animate-none"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </span>
  );
}