import { Button, Chip, Header, Label, ListBox } from "@heroui/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconCollapseAll, IconDrafts, IconExpandAll, IconHistory, IconInbox } from "../../../../../components/icons";
import { ShortcutKbd, shortcutLabel } from "../../../../../components/ShortcutKbd";
import type { HomeTreePayload } from "../../../../../../shared/api";
import { NavKind, RailHint, TreeExpandMode } from "../../../enums";
import type { NavView } from "../../../types";

type Props = {
  nav: NavView;
  payload: HomeTreePayload | null;
  isWorkspace: boolean;
  canToggleAllFolders?: boolean;
  treeExpandMode?: TreeExpandMode;
  onNav: (nav: NavView) => void;
  onToggleAllFolders?: () => void;
};

type WorkKind = NavKind.Inbox | NavKind.Drafts | NavKind.Publications;

function navKey(nav: NavView): string {
  if (nav.kind === NavKind.Folder) {
    return `folder:${nav.path}`;
  }
  return nav.kind;
}

function emitWorkNav(id: string, onNav: (nav: NavView) => void) {
  const next = workNavFromKey(id);
  if (next) {
    onNav(next);
  }
}

function workNavFromKey(id: string): NavView | undefined {
  switch (id) {
    case NavKind.Inbox:
      return { kind: NavKind.Inbox };
    case NavKind.Drafts:
      return { kind: NavKind.Drafts };
    case NavKind.Publications:
      return { kind: NavKind.Publications };
    default:
      return undefined;
  }
}

export function RailNav({
  nav,
  payload,
  isWorkspace,
  canToggleAllFolders,
  treeExpandMode = TreeExpandMode.Expand,
  onNav,
  onToggleAllFolders,
}: Props) {
  const { t } = useTranslation();
  const selected = new Set([navKey(nav)]);
  const pubCount = payload?.publications?.length ?? 0;
  const hasPubs = isWorkspace && pubCount > 0;
  const inboxCount = payload?.inbox.length ?? 0;

  return (
    <ListBox
      aria-label={t("home.nav.myWork")}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={selected}
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        if (key == null) {
          return;
        }
        emitWorkNav(String(key), onNav);
      }}
    >
      <ListBox.Section>
        <Header>{t("home.nav.myWork")}</Header>
        {isWorkspace ? (
          <WorkNavItem id={NavKind.Inbox} label={t("home.nav.inbox")} onNav={onNav}>
            <IconInbox />
            <Label>{t("home.nav.inbox")}</Label>
            {inboxCount > 0 ? (
              <Chip size="sm" variant="soft" color="accent">
                <Chip.Label>{inboxCount}</Chip.Label>
              </Chip>
            ) : null}
            <ShortcutKbd keys={shortcutLabel.inbox()} className="ml-auto" />
          </WorkNavItem>
        ) : null}
        <WorkNavItem id={NavKind.Drafts} label={t("home.nav.drafts")} onNav={onNav}>
          <IconDrafts />
          <Label>{t("home.nav.drafts")}</Label>
          <ShortcutKbd keys={shortcutLabel.drafts()} className="ml-auto" />
        </WorkNavItem>
        {isWorkspace ? (
          <WorkNavItem id={NavKind.Publications} label={t("home.publication.listTitle")} onNav={onNav}>
            <IconHistory />
            <Label>{t("home.publication.listTitle")}</Label>
            {hasPubs ? (
              <Chip size="sm" variant="soft" color="default">
                <Chip.Label>{pubCount}</Chip.Label>
              </Chip>
            ) : null}
            <ShortcutKbd keys={shortcutLabel.publications()} className="ml-auto" />
          </WorkNavItem>
        ) : null}
      </ListBox.Section>
      <ListBox.Section>
        <WorkspaceHeader
          canToggle={Boolean(canToggleAllFolders && onToggleAllFolders)}
          mode={treeExpandMode}
          onToggle={onToggleAllFolders}
        />
        {payload?.needsInit ? (
          <ListBox.Item id={RailHint.Init} textValue={t("home.nav.initHint")} isDisabled>
            <Label className="text-muted">{t("home.nav.initHint")}</Label>
          </ListBox.Item>
        ) : null}
      </ListBox.Section>
    </ListBox>
  );
}

function WorkNavItem({
  id,
  label,
  onNav,
  children,
}: {
  id: WorkKind;
  label: string;
  onNav: (nav: NavView) => void;
  children: ReactNode;
}) {
  return (
    <ListBox.Item
      id={id}
      textValue={label}
      className="w-full pr-1"
      onClick={() => emitWorkNav(id, onNav)}
    >
      {children}
    </ListBox.Item>
  );
}

type WorkspaceHeaderProps = {
  canToggle: boolean;
  mode: TreeExpandMode;
  onToggle?: () => void;
};

function WorkspaceHeader({ canToggle, mode, onToggle }: WorkspaceHeaderProps) {
  const { t } = useTranslation();
  if (!canToggle || !onToggle) {
    return <Header>{t("home.nav.workspace")}</Header>;
  }

  const collapse = mode === TreeExpandMode.Collapse;
  const label = collapse ? t("home.tree.collapseAll") : t("home.tree.expandAll");

  return (
    <Header>
      <span className="flex w-full items-center justify-between gap-1">
        <span className="truncate">{t("home.nav.workspace")}</span>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="size-6 min-w-6 shrink-0"
          aria-label={label}
          onPress={onToggle}
        >
          {collapse ? <IconCollapseAll /> : <IconExpandAll />}
        </Button>
      </span>
    </Header>
  );
}
