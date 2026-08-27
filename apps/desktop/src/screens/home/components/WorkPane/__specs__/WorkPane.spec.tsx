import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { shortcutLabel } from "../../../../../components/ShortcutKbd";
import { mockPayload } from "../../../__fixtures__/home";
import { NavKind } from "../../../enums";
import type { RunOp } from "../../../types";
import { WorkPane } from "../WorkPane";

describe("WorkPane", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();
  const onReview = vi.fn();
  const onLeave = vi.fn();
  const onPublish = vi.fn();
  const onRequestDiscard = vi.fn();
  const onSignIn = vi.fn();
  const onNewPage = vi.fn();
  const onClosePane = vi.fn();
  const runOp = vi.fn(async <T,>(_op: string, fn: () => Promise<T>) => fn()) as unknown as RunOp;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const base = {
    personal: false,
    busy: false,
    pagePath: null as string | null,
    trails: new Map<string, string>(),
    runOp,
    onRefresh,
    onOpenPage,
    onClosePage,
    onReview,
    onLeave,
    onPublish,
    onLand: vi.fn(),
    onLandOther: vi.fn(),
    onRequestDiscard,
    onSignIn,
    onNewPage,
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

  it("closes an empty drafts pane only from the header collapse", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkPane nav={{ kind: NavKind.Drafts }} payload={mockPayload()} {...base} />);
    expect(screen.getByText(t("home.drafts.emptyNeedsTitle"))).toBeInTheDocument();
    const close = screen.getByRole("button", {
      name: `${t("home.drafts.close")} (${shortcutLabel.togglePane()})`,
    });
    expect(screen.getAllByRole("button", { name: new RegExp(t("home.drafts.close")) })).toHaveLength(1);
    await user.click(close);
    expect(onClosePane).toHaveBeenCalled();
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
    expect(
      screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding" }) }),
    ).toBeInTheDocument();
  });

  it("shows next-step copy under the current publication", () => {
    renderWithProviders(
      <WorkPane
        nav={{ kind: NavKind.Publications }}
        payload={mockPayload({
          publication: {
            title: "Onboarding",
            branch: "pub/onboarding",
            kind: "in_review",
          },
          canPublishBatch: true,
          loteReview: {
            prNumber: 12,
            prUrl: "https://example.com/pull/12",
            title: "Onboarding lote",
            branch: "pub/onboarding",
            reviewers: [],
            checksOk: true,
            approvals: 1,
            state: "open",
          },
        })}
        {...base}
        onNewPublication={vi.fn()}
      />,
    );
    expect(screen.getByText(t("home.publication.current"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.statusReadyToPublish"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.publication.publish") })).toBeInTheDocument();
    expect(screen.queryByText(t("home.pr.number", { number: 12 }))).not.toBeInTheDocument();
  });

  const publicationPayload = mockPayload({
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
  });

  it("shows leave wiki footer when a publication is active", () => {
    renderWithProviders(
      <WorkPane nav={{ kind: NavKind.Publications }} payload={publicationPayload} {...base} />,
    );
    expect(screen.getByRole("button", { name: t("home.publication.leave") })).toBeInTheDocument();
  });

  it("shows leave wiki footer in drafts pane when a publication is active", () => {
    renderWithProviders(
      <WorkPane nav={{ kind: NavKind.Drafts }} payload={publicationPayload} {...base} />,
    );
    expect(screen.getByRole("button", { name: t("home.publication.leave") })).toBeInTheDocument();
  });

  it("hides leave wiki footer without an active publication", () => {
    renderWithProviders(
      <WorkPane nav={{ kind: NavKind.Publications }} payload={mockPayload()} {...base} />,
    );
    expect(screen.queryByRole("button", { name: t("home.publication.leave") })).not.toBeInTheDocument();
  });

  it("calls onLeave from the footer", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkPane nav={{ kind: NavKind.Drafts }} payload={publicationPayload} {...base} />,
    );
    await user.click(screen.getByRole("button", { name: t("home.publication.leave") }));
    expect(onLeave).toHaveBeenCalled();
  });

  it("disables leave wiki footer while busy", () => {
    renderWithProviders(
      <WorkPane nav={{ kind: NavKind.Drafts }} payload={publicationPayload} {...base} busy />,
    );
    expect(screen.getByRole("button", { name: t("home.publication.leave") })).toBeDisabled();
  });
});
