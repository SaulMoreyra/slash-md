import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { mockPayload } from "../../../__fixtures__/home";
import type { Run } from "../../../types";
import { PublicationsPane } from "../PublicationsPane";

describe("PublicationsPane", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onNewPublication = vi.fn();
  const onOpenPage = vi.fn();
  const onSignIn = vi.fn();
  const run = vi.fn(async <T,>(fn: () => Promise<T>) => fn()) as unknown as Run;

  const defaultProps: ComponentProps<typeof PublicationsPane> = {
    payload: mockPayload(),
    busy: false,
    pagePath: null,
    trails: new Map(),
    run,
    onRefresh,
    onOpenPage,
    onSignIn,
    onNewPublication,
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
    expect(screen.queryByText("pub/2026-08-20-api-notes")).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.mountedBanner", { title: "Onboarding Q3" }))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.emptyTitle"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.leave") })).not.toBeInTheDocument();
  });

  it("shows PR status and in-review pages under the current publication", () => {
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "in_review",
        },
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
        drafts: [{ path: "docs/guide.md", title: "Guide", badge: "in review" }],
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
    expect(screen.getByText(t("home.publication.current"))).toBeInTheDocument();
    expect(screen.getByText(t("home.pr.kicker"))).toBeInTheDocument();
    expect(screen.getByText(t("home.pr.number", { number: 12 }))).toBeInTheDocument();
    expect(screen.getByText("review/lote")).toBeInTheDocument();
    expect(screen.getByText("Onboarding lote")).toBeInTheDocument();
    expect(screen.getByText(t("home.pr.checksOkShort"))).toBeInTheDocument();
    expect(screen.getByText(t("home.pr.approvals", { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText("Guide")).toBeInTheDocument();
    expect(screen.getByText(t("home.reviews.pages"))).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows waiting for approval without a publish button", () => {
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
    expect(screen.getByText(t("home.pr.waitingApproval"))).toBeInTheDocument();
  });
});
