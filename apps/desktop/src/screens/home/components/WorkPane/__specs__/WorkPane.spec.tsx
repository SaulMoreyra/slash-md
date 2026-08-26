import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { shortcutLabel } from "../../../../../components/ShortcutKbd";
import { mockPayload } from "../../../__fixtures__/home";
import { NavKind, CreateIntent } from "../../../enums";
import type { Run } from "../../../types";
import { WorkPane } from "../WorkPane";

describe("WorkPane", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();
  const onReview = vi.fn();
  const onSignIn = vi.fn();
  const onNewPage = vi.fn();
  const onWriteCover = vi.fn();
  const onClosePane = vi.fn();
  const run = vi.fn(async <T,>(fn: () => Promise<T>) => fn()) as unknown as Run;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const base = {
    personal: false,
    busy: false,
    pagePath: null as string | null,
    trails: new Map<string, string>(),
    run,
    onRefresh,
    onOpenPage,
    onClosePage,
    onReview,
    onSignIn,
    onNewPage,
    onWriteCover,
    onClosePane,
  };

  it("shows loading skeleton when payload is null", () => {
    renderWithProviders(<WorkPane nav={{ kind: NavKind.Drafts }} payload={null} {...base} />);
    expect(screen.getByText(t("common.loading"))).toBeInTheDocument();
    expect(screen.getByText(t("home.nav.drafts"))).toBeInTheDocument();
  });

  it("renders inbox pane for inbox nav", () => {
    renderWithProviders(
      <WorkPane nav={{ kind: NavKind.Inbox }} payload={mockPayload()} {...base} />,
    );
    expect(screen.getByText(t("home.inbox.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${t("home.drafts.close")} (${shortcutLabel.togglePane()})` })).toBeInTheDocument();
  });

  it("shows section empty instead of child files", () => {
    renderWithProviders(
      <WorkPane
        nav={{ kind: NavKind.Folder, path: "docs", title: "docs" }}
        payload={mockPayload()}
        folder={{
          kind: "folder",
          path: "docs",
          title: "docs",
          children: [{ kind: "file", path: "docs/guide.md", title: "Guía de ejemplo" }],
        }}
        {...base}
      />,
    );
    expect(screen.queryByText("Guía de ejemplo")).not.toBeInTheDocument();
    expect(screen.getByText(t("home.section.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.section.writeCover") })).toBeInTheDocument();
  });

  it("labels empty template folder create as new template", () => {
    renderWithProviders(
      <WorkPane
        nav={{ kind: NavKind.Folder, path: "templates", title: "templates" }}
        payload={mockPayload({
          roots: [{ kind: "folder", path: "templates", title: "templates", children: [] }],
        })}
        folder={{ kind: "folder", path: "templates", title: "templates", children: [] }}
        createIntent={CreateIntent.Template}
        {...base}
      />,
    );
    expect(screen.getByRole("button", { name: t("home.nav.newTemplate") })).toBeInTheDocument();
  });

  it("shows the current publication without duplicate actions", () => {
    renderWithProviders(
      <WorkPane
        nav={{ kind: NavKind.Publications }}
        payload={mockPayload({
          publication: {
            title: "Onboarding",
            branch: "pub/onboarding",
            kind: "draft",
          },
          publications: [
            {
              title: "Onboarding",
              branch: "pub/onboarding",
              kind: "draft",
              mounted: true,
            },
          ],
        })}
        {...base}
        onNewPublication={vi.fn()}
      />,
    );
    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.current"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.leave") })).not.toBeInTheDocument();
  });
});
