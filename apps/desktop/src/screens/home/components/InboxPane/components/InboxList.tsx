import { Avatar, Description, Label, ListBox } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { HomeTreePayload } from "../../../../../../shared/api";
import { relativeTime } from "../../../../../i18n/relativeTime";

type InboxItem = HomeTreePayload["inbox"][number];

type Props = {
  items: InboxItem[];
  listLabel: string;
  onOpenPage: (path: string, threadId?: string) => void;
};

export function InboxList({ items, listLabel, onOpenPage }: Props) {
  const { i18n } = useTranslation();
  return (
    <ListBox
      aria-label={listLabel}
      selectionMode="single"
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        if (key == null) {
          return;
        }
        const item = items.find((row) => `${row.prNumber}-${row.threadId}` === String(key));
        if (item) {
          onOpenPage(item.path, item.threadId);
        }
      }}
    >
      {items.map((item) => (
        <ListBox.Item
          key={`${item.prNumber}-${item.threadId}`}
          id={`${item.prNumber}-${item.threadId}`}
          textValue={item.excerpt || item.path}
        >
          <Avatar size="sm" color="default">
            <Avatar.Fallback>{(item.author || "?").slice(0, 1).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Label className="truncate">{item.author}</Label>
            <Description className="truncate">{item.excerpt || item.path}</Description>
            <Description className="text-xs">
              {relativeTime(item.createdAt, i18n.language)} · #{item.prNumber}
            </Description>
          </div>
        </ListBox.Item>
      ))}
    </ListBox>
  );
}
