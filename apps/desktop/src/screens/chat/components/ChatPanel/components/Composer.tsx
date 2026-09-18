import { Button, TextArea } from "@heroui/react";
import { useTranslation } from "react-i18next";

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

  return (
    <div className="border-t border-separator">
      <TextArea
        className="resize-none rounded-none border-0! bg-transparent! shadow-none! outline-none ring-0! focus:border-0! focus:bg-transparent! focus:ring-0! focus-visible:ring-0! data-focused:ring-0! data-focus-visible:ring-0!"
        value={composer.draft}
        onChange={(event) => composer.onDraftChange(event.target.value)}
        rows={2}
        fullWidth
        placeholder={t("home.chat.placeholder")}
        aria-label={t("home.chat.placeholder")}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            composer.onSend();
          }
        }}
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
