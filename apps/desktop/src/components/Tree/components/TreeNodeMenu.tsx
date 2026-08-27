import { Dropdown } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { HomeTreeNode } from "../../../../shared/api";
import { IconMore } from "../../icons";
import { TreeNodeAction } from "../enums";

export type TreeNodeMenuProps = {
  node: HomeTreeNode;
  onRename: (node: HomeTreeNode) => void;
  onDelete: (node: HomeTreeNode) => void;
  onNewFile?: (node: HomeTreeNode) => void;
  onNewFolder?: (node: HomeTreeNode) => void;
};

export function TreeNodeMenu({ node, onRename, onDelete, onNewFile, onNewFolder }: TreeNodeMenuProps) {
  const { t } = useTranslation();
  const menuLabel = t("home.tree.menuAria", { title: node.title });
  const showCreate = node.kind === "folder" && onNewFile && onNewFolder;

  return (
    <div
      className="shrink-0 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 has-aria-expanded:opacity-100"
      onPointerDown={(ev) => ev.stopPropagation()}
    >
      <Dropdown>
        <Dropdown.Trigger
          aria-label={menuLabel}
          className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-default/60 hover:text-foreground"
        >
          <IconMore />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={menuLabel}
            onAction={(key) => {
              if (key === TreeNodeAction.NewFile) {
                onNewFile?.(node);
              }
              if (key === TreeNodeAction.NewFolder) {
                onNewFolder?.(node);
              }
              if (key === TreeNodeAction.Rename) {
                onRename(node);
              }
              if (key === TreeNodeAction.Delete) {
                onDelete(node);
              }
            }}
          >
            {showCreate ? (
              <Dropdown.Item id={TreeNodeAction.NewFile} textValue={t("home.tree.newFile")}>
                {t("home.tree.newFile")}
              </Dropdown.Item>
            ) : null}
            {showCreate ? (
              <Dropdown.Item id={TreeNodeAction.NewFolder} textValue={t("home.tree.newFolder")}>
                {t("home.tree.newFolder")}
              </Dropdown.Item>
            ) : null}
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
