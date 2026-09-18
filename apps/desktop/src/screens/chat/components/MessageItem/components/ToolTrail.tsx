import { Chip, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { ChatToolNote } from "../../../types";

export function ToolTrail({ tools }: { tools: ChatToolNote[] }) {
  const { t } = useTranslation();
  const last = tools[tools.length - 1];
  if (!last) {
    return null;
  }

  return (
    <ScrollShadow
      orientation="horizontal"
      className="flex max-w-full gap-1 [--scroll-shadow-scrollbar-size:0px]"
      aria-label={t("home.chat.tools")}
    >
      {tools.map((tool, index) => (
        <Chip key={`${tool.name}-${index}`} size="sm" variant="soft" color="accent">
          <Chip.Label>{tool.brief ? `${tool.name}: ${tool.brief}` : tool.name}</Chip.Label>
        </Chip>
      ))}
    </ScrollShadow>
  );
}
