import { Button, TextArea } from "@heroui/react";
import { extractMentions } from "@slash-md/agents/context";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { removeMentionToken } from "../../../../utils";
import { MentionPopup } from "./components/MentionPopup";
import { ReferencesBar } from "./components/ReferencesBar";
import { useAutoGrowTextArea } from "./hooks/useAutoGrowTextArea";
import { useComposerMention } from "./hooks/useComposerMention";

type Props = {
  composer: {
    draft: string;
    canSend: boolean;
    onDraftChange: (value: string) => void;
    onSend: () => void;
  };
  streaming: boolean;
  onAbort: () => void;
  onRewrite?: () => void;
};

export function Composer({ composer, streaming, onAbort, onRewrite }: Props) {
  const { t } = useTranslation();
  const mention = useComposerMention({
    draft: composer.draft,
    onDraftChange: composer.onDraftChange,
  });
  const mentionedPaths = extractMentions(composer.draft);
  const textAreaRef = useAutoGrowTextArea(composer.draft);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        mention.onNext();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        mention.onPrev();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        mention.onClose();
        return;
      }
      if (event.key === "Enter") {
        const entry = mention.matches[mention.active];
        if (entry) {
          event.preventDefault();
          mention.onPick(entry.path);
          return;
        }
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.onSend();
    }
  };

  return (
    <div className="border-t border-separator">
      <div className="relative">
        {mention.open ? (
          <MentionPopup
            query={mention.query}
            matches={mention.matches}
            active={mention.active}
            onActivate={mention.onActivate}
            onPick={(entry) => mention.onPick(entry.path)}
          />
        ) : null}
        <TextArea
          ref={textAreaRef}
          className="resize-none rounded-none border-0! bg-transparent! shadow-none! outline-none ring-0! focus:border-0! focus:bg-transparent! focus:ring-0! focus-visible:ring-0! data-focused:ring-0! data-focus-visible:ring-0!"
          value={composer.draft}
          onChange={(event) => composer.onDraftChange(event.target.value)}
          rows={2}
          fullWidth
          placeholder={t("home.chat.placeholder")}
          aria-label={t("home.chat.placeholder")}
          onKeyDown={handleKeyDown}
        />
      </div>
      <ReferencesBar
        paths={mentionedPaths}
        onRemove={(path) =>
          composer.onDraftChange(removeMentionToken(composer.draft, path).trim())
        }
      />
      <div className="flex items-center justify-end gap-2 px-3 pb-3">
        {streaming ? (
          <Button variant="ghost" size="sm" onPress={onAbort}>
            {t("home.chat.stop")}
          </Button>
        ) : null}
        {onRewrite ? (
          <Button
            variant="ghost"
            size="sm"
            isDisabled={!composer.canSend || streaming}
            onPress={onRewrite}
          >
            {t("home.chat.editPage")}
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          isDisabled={!composer.canSend}
          onPress={composer.onSend}
        >
          {t("home.chat.send")}
        </Button>
      </div>
    </div>
  );
}