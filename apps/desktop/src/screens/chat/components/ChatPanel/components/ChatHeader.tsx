import { Button, Card, Dropdown } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { AgentInfo } from "@slash-md/agents/types";
import { IconClose, IconMore, IconTrash } from "../../../../../components/icons";

type Props = {
  title: string;
  agents: { items: AgentInfo[]; selected: string | null; onSelect: (name: string) => void };
  disabled: boolean;
  canClear: boolean;
  onClear: () => void;
  onClose?: () => void;
};

export function ChatHeader({ title, agents, disabled, canClear, onClear, onClose }: Props) {
  const { t } = useTranslation();
  const selected = agents.items.find((agent) => agent.name === agents.selected);
  const label = selected?.label ?? agents.selected ?? t("home.chat.noAgent");

  return (
    <div className="px-4 pt-2">
      <Card.Header className="flex flex-row items-center justify-between gap-2">
        <Card.Title className="min-w-0 flex-1 truncate">{title}</Card.Title>
        <div className="flex shrink-0 items-center gap-1">
          <AgentMenu
            label={label}
            items={agents.items}
            selected={agents.selected}
            disabled={disabled}
            onSelect={agents.onSelect}
          />
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            isDisabled={!canClear}
            aria-label={t("home.chat.clear")}
            onPress={onClear}
          >
            <IconTrash />
          </Button>
          {onClose ? (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t("home.chat.close")}
              onPress={onClose}
            >
              <IconClose />
            </Button>
          ) : null}
        </div>
      </Card.Header>
    </div>
  );
}

function AgentMenu({
  label,
  items,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  items: AgentInfo[];
  selected: string | null;
  disabled: boolean;
  onSelect: (name: string) => void;
}) {
  const { t } = useTranslation();

  if (!items.length) {
    return null;
  }

  return (
    <Dropdown>
      <Dropdown.Trigger
        className="flex max-w-40 items-center gap-1 rounded-xl px-2 py-1 text-sm hover:bg-default/40 disabled:opacity-50"
        isDisabled={disabled}
        aria-label={t("home.chat.agents")}
      >
        <span className="min-w-0 truncate">{label}</span>
        <IconMore size={14} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={t("home.chat.agents")}
          selectionMode="single"
          selectedKeys={selected ? [selected] : []}
          onAction={(key) => onSelect(String(key))}
        >
          {items.map((agent) => (
            <Dropdown.Item
              key={agent.name}
              id={agent.name}
              textValue={agent.label}
              isDisabled={!agent.available}
            >
              <span className="flex-1">{agent.label}</span>
              {agent.available ? null : (
                <span className="text-xs text-muted">{t("home.chat.unavailable")}</span>
              )}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
