import { Chip, Header, Label, ListBox } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconDrafts, IconHistory, IconInbox, IconReviews } from "../../../../../components/icons";
import { ShortcutKbd, shortcutLabel } from "../../../../../components/ShortcutKbd";
import type { HomeTreePayload } from "../../../../../../shared/api";
import { NavKind, RailHint } from "../../../enums";
import type { NavView } from "../../../types";

type Props = {
  nav: NavView;
  payload: HomeTreePayload | null;
  isWorkspace: boolean;
  onNav: (nav: NavView) => void;
};

function navKey(nav: NavView): string {
  if (nav.kind === NavKind.Folder) {
    return `folder:${nav.path}`;
  }
  return nav.kind;
}

function workNavFromKey(id: string): NavView | undefined {
  switch (id) {
    case NavKind.Inbox:
      return { kind: NavKind.Inbox };
    case NavKind.Drafts:
      return { kind: NavKind.Drafts };
    case NavKind.Reviews:
      return { kind: NavKind.Reviews };
    case NavKind.Publications:
      return { kind: NavKind.Publications };
    default:
      return undefined;
  }
}

export function RailNav({ nav, payload, isWorkspace, onNav }: Props) {
  const { t } = useTranslation();
  const selected = new Set([navKey(nav)]);
  const pubCount = payload?.publications?.length ?? 0;
  const hasPubs = isWorkspace && pubCount > 0;
  const inboxCount = payload?.inbox.length ?? 0;

  return (
    <ListBox
      aria-label={t("home.nav.myWork")}
      selectionMode="single"
      selectedKeys={selected}
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        if (key == null) {
          return;
        }
        const next = workNavFromKey(String(key));
        if (next) {
          onNav(next);
        }
      }}
    >
      <ListBox.Section>
        <Header>{t("home.nav.myWork")}</Header>
        {isWorkspace ? (
          <ListBox.Item id={NavKind.Inbox} textValue={t("home.nav.inbox")} className="w-full pr-1">
            <IconInbox />
            <Label>{t("home.nav.inbox")}</Label>
            {inboxCount > 0 ? (
              <Chip size="sm" variant="soft" color="accent">
                <Chip.Label>{inboxCount}</Chip.Label>
              </Chip>
            ) : null}
            <ShortcutKbd keys={shortcutLabel.inbox()} className="ml-auto" />
          </ListBox.Item>
        ) : null}
        <ListBox.Item id={NavKind.Drafts} textValue={t("home.nav.drafts")} className="w-full pr-1">
          <IconDrafts />
          <Label>{t("home.nav.drafts")}</Label>
          <ShortcutKbd keys={shortcutLabel.drafts()} className="ml-auto" />
        </ListBox.Item>
        {isWorkspace ? (
          <ListBox.Item id={NavKind.Reviews} textValue={t("home.nav.inReview")} className="w-full pr-1">
            <IconReviews />
            <Label>{t("home.nav.inReview")}</Label>
            <ShortcutKbd keys={shortcutLabel.reviews()} className="ml-auto" />
          </ListBox.Item>
        ) : null}
        {isWorkspace ? (
          <ListBox.Item id={NavKind.Publications} textValue={t("home.publication.listTitle")} className="w-full pr-1">
            <IconHistory />
            <Label>{t("home.publication.listTitle")}</Label>
            {hasPubs ? (
              <Chip size="sm" variant="soft" color="default">
                <Chip.Label>{pubCount}</Chip.Label>
              </Chip>
            ) : null}
            <ShortcutKbd keys={shortcutLabel.publications()} className="ml-auto" />
          </ListBox.Item>
        ) : null}
      </ListBox.Section>
      <ListBox.Section>
        <Header>{t("home.nav.workspace")}</Header>
        {payload?.needsInit ? (
          <ListBox.Item id={RailHint.Init} textValue={t("home.nav.initHint")} isDisabled>
            <Label className="text-muted">{t("home.nav.initHint")}</Label>
          </ListBox.Item>
        ) : null}
      </ListBox.Section>
    </ListBox>
  );
}
