import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { mockPayload } from "../../../__fixtures__/home";
import type { RunOp } from "../../../types";
import { PublicationsPane } from "../PublicationsPane";

describe("PublicationsPane", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onNewPublication = vi.fn();
  const onOpenPage = vi.fn();
  const onSignIn = vi.fn();
  const onReview = vi.fn();
  const onLeave = vi.fn();
  const onPublish = vi.fn();
  const onLand = vi.fn();
  const onLandOther = vi.fn();
  const onRequestDiscard = vi.fn();
  const runOp = vi.fn(async <T,>(_op: string, fn: () => Promise<T>) => fn()) as unknown as RunOp;

  const defaultProps: ComponentProps<typeof PublicationsPane> = {
    payload: mockPayload(),
    busy: false,
    pagePath: null,
    trails: new Map(),
    runOp,
    onRefresh,
    onOpenPage,
    onSignIn,
    onNewPublication,
    onReview,
    onLeave,
    onPublish,
    onLand,
    onLandOther,
    onRequestDiscard,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<ComponentProps<typeof PublicationsPane>> = {}) =>
    renderWithProviders(<PublicationsPane {...defaultProps} {...props} />);

  it("renders empty copy and creates a publication", async () => {
    const user = userEvent.setup();
    renderComponent();
    expect(screen.getByText(t("home.publication.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.emptyBody"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.reviews.emptyTitle"))).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: t("home.publication.new") }).at(-1)!);
    expect(onNewPublication).toHaveBeenCalled();
  });

  it("disables the new publication action while busy", () => {
    renderComponent({
      busy: true,
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "draft",
        },
        publications: [
          {
            title: "Onboarding Q3",
            branch: "pub/2026-08-25-onboarding-q3",
            kind: "draft",
            mounted: true,
          },
        ],
      }),
    });
    expect(screen.getByRole("button", { name: t("home.publication.new") })).toBeDisabled();
  });

  it("lists other publications under the current card", () => {
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "draft",
        },
        publications: [
          {
            title: "Onboarding Q3",
            branch: "pub/2026-08-25-onboarding-q3",
            kind: "draft",
            mounted: true,
          },
          {
            title: "API notes",
            branch: "pub/2026-08-20-api-notes",
            kind: "in_review",
            mounted: false,
          },
        ],
      }),
    });
    expect(screen.getByText("Onboarding Q3")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.current"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.others"))).toBeInTheDocument();
    expect(screen.getByText("API notes")).toBeInTheDocument();
    expect(screen.queryByText("pub/2026-08-25-onboarding-q3")).not.toBeInTheDocument();
    expect(screen.getByText("pub/2026-08-20-api-notes")).toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.mountedBanner", { title: "Onboarding Q3" }))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.emptyTitle"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }),
    ).toBeInTheDocument();
  });

  it("shows next-step copy and in-review pages under the current publication", () => {
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "in_review",
        },
        canPublishBatch: true,
        loteReview: {
          prNumber: 12,
          prUrl: "https://example.com/pull/12",
          title: "Onboarding lote",
          branch: "review/lote",
          reviewers: ["ada"],
          reviewerPeople: [{ login: "ada" }],
          checksOk: true,
          approvals: 2,
          state: "open",
        },
        drafts: [{ path: "docs/guide.md", title: "Guide", badge: "in review" }],
        publications: [
          {
            title: "Onboarding Q3",
            branch: "pub/2026-08-25-onboarding-q3",
            kind: "in_review",
            mounted: true,
            commenters: [{ login: "bob" }],
          },
        ],
      }),
    });
    expect(screen.getByText(t("home.publication.current"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.statusReadyToPublish"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.pr.kicker"))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.pr.number", { number: 12 }))).not.toBeInTheDocument();
    expect(screen.queryByText("review/lote")).not.toBeInTheDocument();
    expect(screen.queryByText("Onboarding lote")).not.toBeInTheDocument();
    expect(screen.getByText("pub/2026-08-25-onboarding-q3")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.reviewersLabel"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.commentsLabel"))).toBeInTheDocument();
    expect(screen.getByText("Guide")).toBeInTheDocument();
    expect(screen.getByText(t("home.reviews.pages"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.publication.publish") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("prefers send over publish when both flags are set", () => {
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "in_review",
        },
        canSendReview: true,
        canPublishBatch: true,
        loteReview: {
          prNumber: 12,
          prUrl: "https://example.com/pull/12",
          title: "Onboarding lote",
          branch: "review/lote",
          reviewers: ["ada"],
          checksOk: true,
          approvals: 2,
          state: "open",
        },
      }),
    });
    expect(screen.getByRole("button", { name: t("home.publication.sendReview") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
  });

  it("leaves from the current publication menu", async () => {
    const user = userEvent.setup();
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "draft",
        },
      }),
    });
    await user.click(
      screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }),
    );
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.leave") }));
    expect(onLeave).toHaveBeenCalled();
  });

  it("updates the wiki from a published current publication", async () => {
    const user = userEvent.setup();
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "published",
          prNumber: 12,
          prUrl: "https://example.com/pull/12",
        },
        publications: [
          {
            title: "Onboarding Q3",
            branch: "pub/2026-08-25-onboarding-q3",
            kind: "published",
            mounted: true,
          },
        ],
      }),
    });
    expect(screen.getByText(t("home.publication.kindPublished"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.statusOnWiki"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("home.publication.landWiki") }));
    expect(onLand).toHaveBeenCalled();
  });

  it("shows waiting for approval without a publish button or PR number", () => {
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding lote",
          branch: "review/lote",
          kind: "in_review",
        },
        canPublishBatch: true,
        loteReview: {
          prNumber: 12,
          prUrl: "https://example.com/pull/12",
          title: "Onboarding lote",
          branch: "review/lote",
          reviewers: ["ada"],
          checksOk: true,
          approvals: 0,
          state: "open",
        },
      }),
    });
    expect(screen.queryByRole("button", { name: new RegExp(t("home.reviews.approvePublish")) })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    expect(screen.getByText(t("home.publication.statusWaitingApproval"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.pr.kicker"))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.pr.number", { number: 12 }))).not.toBeInTheDocument();
  });

  it("does not invent a PR strip without a mounted publication", () => {
    renderComponent({
      payload: mockPayload({
        loteReview: {
          prNumber: 12,
          prUrl: "https://example.com/pull/12",
          title: "Onboarding lote",
          branch: "review/lote",
          reviewers: ["ada"],
          checksOk: true,
          approvals: 2,
          state: "open",
        },
      }),
    });
    expect(screen.queryByText(t("home.pr.kicker"))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.pr.number", { number: 12 }))).not.toBeInTheDocument();
  });

  it("asks to discard another publication without resuming it", async () => {
    const user = userEvent.setup();
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "draft",
        },
        publications: [
          {
            title: "Onboarding Q3",
            branch: "pub/2026-08-25-onboarding-q3",
            kind: "draft",
            mounted: true,
          },
          {
            title: "API notes",
            branch: "pub/2026-08-20-api-notes",
            kind: "in_review",
            prNumber: 9,
            mounted: false,
          },
        ],
      }),
    });
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "API notes" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.discard") }));
    expect(onRequestDiscard).toHaveBeenCalledWith({
      branch: "pub/2026-08-20-api-notes",
      title: "API notes",
      kind: "in_review",
      prNumber: 9,
      mounted: false,
      dirtyCount: 0,
    });
    expect(runOp).not.toHaveBeenCalled();
  });

  it("opens sign in instead of discard when the review needs auth", async () => {
    const user = userEvent.setup();
    renderComponent({
      payload: mockPayload({
        needsAuth: true,
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "in_review",
        },
        publications: [
          {
            title: "Onboarding Q3",
            branch: "pub/2026-08-25-onboarding-q3",
            kind: "in_review",
            mounted: true,
          },
        ],
      }),
    });
    await user.click(
      screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }),
    );
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.discard") }));
    expect(onSignIn).toHaveBeenCalled();
    expect(onRequestDiscard).not.toHaveBeenCalled();
  });
});
