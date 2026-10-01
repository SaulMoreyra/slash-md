import { ScrollShadow } from "@heroui/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ChatTurn } from "../../types";
import { MessageItem } from "../MessageItem";

type Props = {
  turns: ChatTurn[];
  onOpenLink: (href: string) => void;
  /** While streaming, keep scroll anchored without the smooth glide. */
  streaming?: boolean;
};

export function MessageList({ turns, onOpenLink, streaming = false }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: streaming ? "auto" : "smooth" });
  }, [turns, streaming]);

  if (!turns.length) {
    return <Empty />;
  }

  return (
    <ScrollShadow className="min-h-0 flex-1 px-3 py-2 [--scroll-shadow-scrollbar-size:0px]">
      <div className="flex flex-col gap-4">
        {turns.map((turn) => (
          <MessageItem key={turn.id} turn={turn} onOpenLink={onOpenLink} />
        ))}
        <div ref={endRef} />
      </div>
    </ScrollShadow>
  );
}

function Empty() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-6 text-center animate-fade-in motion-reduce:animate-none">
      <p className="text-sm text-muted">{t("home.chat.empty")}</p>
      <p className="text-xs text-muted">{t("home.chat.emptyHint")}</p>
    </div>
  );
}
