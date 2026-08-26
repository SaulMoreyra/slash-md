import { Button } from "@heroui/react";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  IconDrafts,
  IconHistory,
  IconInbox,
  IconReviews,
} from "../../../../../components/icons";
import { shortcutLabel } from "../../../../../components/ShortcutKbd";
import { NavKind } from "../../../enums";
import type { NavView } from "../../../types";

type Props = {
  nav: NavView;
  isWorkspace: boolean;
  inboxCount: number;
  onNav: (nav: NavView) => void;
};

type NavIconItem = {
  kind: NavKind;
  label: string;
  keys: string;
  icon: ReactNode;
  badge?: boolean;
};

export function RailCollapsedNav({ nav, isWorkspace, inboxCount, onNav }: Props) {
  const { t } = useTranslation();
  const items = collapsedNavItems(t, isWorkspace, inboxCount);

  return (
    <div className="flex flex-col items-center gap-1">
      <CollapsedNavList items={items} selected={nav.kind} onNav={onNav} />
    </div>
  );
}

function collapsedNavItems(t: TFunction, isWorkspace: boolean, inboxCount: number): NavIconItem[] {
  const items: NavIconItem[] = [];
  if (isWorkspace) {
    items.push({
      kind: NavKind.Inbox,
      label: t("home.nav.inbox"),
      keys: shortcutLabel.inbox(),
      icon: <IconInbox />,
      badge: inboxCount > 0,
    });
  }
  items.push({
    kind: NavKind.Drafts,
    label: t("home.nav.drafts"),
    keys: shortcutLabel.drafts(),
    icon: <IconDrafts />,
  });
  if (isWorkspace) {
    items.push(
      {
        kind: NavKind.Reviews,
        label: t("home.nav.inReview"),
        keys: shortcutLabel.reviews(),
        icon: <IconReviews />,
      },
      {
        kind: NavKind.Publications,
        label: t("home.publication.listTitle"),
        keys: shortcutLabel.publications(),
        icon: <IconHistory />,
      },
    );
  }
  return items;
}

function viewFromKind(kind: NavKind): NavView {
  if (kind === NavKind.Inbox) {
    return { kind: NavKind.Inbox };
  }
  if (kind === NavKind.Reviews) {
    return { kind: NavKind.Reviews };
  }
  if (kind === NavKind.Publications) {
    return { kind: NavKind.Publications };
  }
  return { kind: NavKind.Drafts };
}

function CollapsedNavList({
  items,
  selected,
  onNav,
}: {
  items: NavIconItem[];
  selected: NavKind;
  onNav: (nav: NavView) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <CollapsedNavButton key={item.kind} item={item} selected={selected === item.kind} onNav={onNav} />
      ))}
    </>
  );
}

function CollapsedNavButton({
  item,
  selected,
  onNav,
}: {
  item: NavIconItem;
  selected: boolean;
  onNav: (nav: NavView) => void;
}) {
  return (
    <Button
      isIconOnly
      size="sm"
      variant={selected ? "secondary" : "ghost"}
      aria-label={`${item.label} (${item.keys})`}
      onPress={() => onNav(viewFromKind(item.kind))}
    >
      <span className="relative">
        {item.icon}
        {item.badge ? <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" /> : null}
      </span>
    </Button>
  );
}
