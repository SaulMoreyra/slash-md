import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { mockPayload } from "../../../__fixtures__/home";
import { ReviewsPane } from "../ReviewsPane";

describe("ReviewsPane", () => {
  const onOpenPage = vi.fn();
  const onSignIn = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (payload = mockPayload()) =>
    renderWithProviders(
      <ReviewsPane
        payload={payload}
        pagePath={null}
        trails={new Map()}
        onOpenPage={onOpenPage}
        onSignIn={onSignIn}
      />,
    );

  it("renders empty reviews copy", () => {
    renderComponent();
    expect(screen.getByText(t("home.reviews.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.reviews.emptyBody"))).toBeInTheDocument();
  });

  it("shows PR status cells and pages without draft checkboxes", () => {
    renderComponent(
      mockPayload({
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
      }),
    );
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
    renderComponent(
      mockPayload({
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
    );
    expect(screen.queryByRole("button", { name: new RegExp(t("home.reviews.approvePublish")) })).not.toBeInTheDocument();
    expect(screen.getByText(t("home.pr.waitingApproval"))).toBeInTheDocument();
  });
});
