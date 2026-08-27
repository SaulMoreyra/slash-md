import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { PublicationState } from "@slash-md/core/homeTypes";
import { cleanup, renderWithProviders, screen, userEvent, waitFor } from "../../../../../../test/render";
import { PublicationCta, PublicationKind, PublicationStatusTone } from "../../../../enums";
import { CurrentPublication } from "../CurrentPublication";

describe("CurrentPublication", () => {
  const onReview = vi.fn();
  const onLeave = vi.fn();
  const onPublish = vi.fn();
  const onLand = vi.fn();
  const openUrl = vi.fn();

  const publication: PublicationState = {
    title: "Onboarding Q3",
    branch: "pub/2026-08-25-onboarding-q3",
    kind: PublicationKind.Draft,
  };

  const defaultProps = {
    publication,
    statusLine: null as string | null,
    statusTone: PublicationStatusTone.Default,
    changeCount: 0,
    cta: PublicationCta.None,
    busy: false,
    onReview,
    onLeave,
    onPublish,
    onLand,
    reviewers: [] as { login: string }[],
    commenters: [] as { login: string }[],
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { openUrl },
    });
  });

  const renderComponent = (props: Partial<typeof defaultProps> & { prUrl?: string } = {}) =>
    renderWithProviders(<CurrentPublication {...defaultProps} {...props} />);

  it("renders title and kind without git branch names", () => {
    renderComponent();
    expect(screen.getByText("Onboarding Q3")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.current"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.kindDraft"))).toBeInTheDocument();
    expect(screen.queryByText("pub/2026-08-25-onboarding-q3")).not.toBeInTheDocument();
  });

  it("renders a review well with branch, reviewers, and commenters", () => {
    renderComponent({
      publication: { ...publication, kind: PublicationKind.InReview },
      statusLine: t("home.publication.statusWaitingApproval"),
      statusTone: PublicationStatusTone.Warning,
      reviewers: [{ login: "ada" }],
      commenters: [{ login: "bob" }],
    });
    expect(screen.getByText("pub/2026-08-25-onboarding-q3")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.statusWaitingApproval"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.reviewersLabel"))).toBeInTheDocument();
    expect(screen.getByLabelText(t("home.publication.reviewersAria", { names: "@ada" }))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.commentsLabel"))).toBeInTheDocument();
    expect(screen.getByLabelText(t("home.publication.commentersAria", { names: "@bob" }))).toBeInTheDocument();
  });

  it("renders a next-step line and hides a zero change count", () => {
    renderComponent({ statusLine: t("home.publication.statusUnsent"), changeCount: 0 });
    expect(screen.getByText(t("home.publication.statusUnsent"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.changesCount", { count: 0 }))).not.toBeInTheDocument();
  });

  it("renders a change count when there are dirty pages", () => {
    renderComponent({
      publication: { ...publication, kind: PublicationKind.InReview },
      statusLine: t("home.publication.statusWaitingApproval"),
      statusTone: PublicationStatusTone.Warning,
      changeCount: 2,
    });
    expect(screen.getByText(t("home.publication.statusWaitingApproval"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.changesCount", { count: 2 }))).toBeInTheDocument();
  });

  it("sends to review from the card cta", async () => {
    const user = userEvent.setup();
    renderComponent({ cta: PublicationCta.Send });
    await user.click(screen.getByRole("button", { name: t("home.publication.sendReview") }));
    expect(onReview).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
  });

  it("publishes from the card cta", async () => {
    const user = userEvent.setup();
    renderComponent({ cta: PublicationCta.Publish });
    await user.click(screen.getByRole("button", { name: t("home.publication.publish") }));
    expect(onPublish).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
  });

  it("lands a published publication from the card cta", async () => {
    const user = userEvent.setup();
    renderComponent({
      publication: { ...publication, kind: PublicationKind.Published, prNumber: 12, prUrl: "https://example.com/pull/12" },
      statusLine: t("home.publication.statusOnWiki"),
      statusTone: PublicationStatusTone.Success,
      cta: PublicationCta.Land,
    });
    expect(screen.getByText(t("home.publication.kindPublished"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.statusOnWiki"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("home.publication.landWiki") }));
    expect(onLand).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
  });

  it("hides discard on a published publication", async () => {
    const user = userEvent.setup();
    renderComponent({
      publication: { ...publication, kind: PublicationKind.Published },
      cta: PublicationCta.Land,
    });
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    expect(screen.queryByRole("menuitem", { name: t("home.publication.discard") })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("home.publication.leave") })).toBeInTheDocument();
  });

  it("copies the branch from the overflow menu without showing it on the card", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.copyBranch") }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("pub/2026-08-25-onboarding-q3");
    });
    expect(screen.queryByText("pub/2026-08-25-onboarding-q3")).not.toBeInTheDocument();
  });

  it("opens github from the overflow menu", async () => {
    const user = userEvent.setup();
    renderComponent({ prUrl: "https://example.com/pull/12" });
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.viewOnGithub") }));
    expect(openUrl).toHaveBeenCalledWith("https://example.com/pull/12");
  });
});
