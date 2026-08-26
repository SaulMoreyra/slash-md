import { Button, Dropdown } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { HomeTreeNode } from "../../../../shared/api";
import { IconMore } from "../../icons";
import { TreeNodeAction } from "../enums";

export type TreeNodeMenuProps = {
  node: HomeTreeNode;
  onRename: (node: HomeTreeNode) => void;
  onDelete: (node: HomeTreeNode) => void;
};

export function TreeNodeMenu({ node, onRename, onDelete }: TreeNodeMenuProps) {
  const { t } = useTranslation();

  return (
    <div
      className="shrink-0 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 has-aria-expanded:opacity-100"
      onPointerDown={(ev) => ev.stopPropagation()}
    >
      <Dropdown>
        <Dropdown.Trigger>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={t("home.tree.menuAria", { title: node.title })}
            className="text-muted"
          >
            <IconMore />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={t("home.tree.menuAria", { title: node.title })}
            onAction={(key) => {
              if (key === TreeNodeAction.Rename) {
                onRename(node);
              }
              if (key === TreeNodeAction.Delete) {
                onDelete(node);
              }
            }}
          >
            <Dropdown.Item id={TreeNodeAction.Rename} textValue={t("home.tree.rename")}>
              {t("home.tree.rename")}
            </Dropdown.Item>
            <Dropdown.Item id={TreeNodeAction.Delete} textValue={t("home.tree.delete")} className="text-danger">
              {t("home.tree.delete")}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
