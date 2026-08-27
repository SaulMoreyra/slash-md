import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { PublicationKind } from "../../../enums";
import type { DiscardPublicationTarget } from "../../../types";
import { ConfirmDiscardPublicationModal } from "../ConfirmDiscardPublicationModal";

describe("ConfirmDiscardPublicationModal", () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  const mountedDraft: DiscardPublicationTarget = {
    branch: "pub/onboarding",
    title: "Onboarding Q3",
    kind: PublicationKind.Draft,
    mounted: true,
    dirtyCount: 2,
  };

  const defaultProps = {
    target: mountedDraft,
    busy: false,
    onClose,
    onConfirm,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<ConfirmDiscardPublicationModal {...defaultProps} {...props} />);

  it("confirms discard of a mounted draft with dirty pages", async () => {
    const user = userEvent.setup();
    renderComponent();
    expect(screen.getByRole("heading", { name: t("home.publication.discardTitle", { title: "Onboarding Q3" }) })).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.discardLede"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.discardDirty", { count: 2 }))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("home.publication.discard") }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("mentions a cancelled review without a PR number", () => {
    renderComponent({
      target: {
        ...mountedDraft,
        kind: PublicationKind.InReview,
        prNumber: 12,
        dirtyCount: 0,
      },
    });
    expect(screen.getByText(t("home.publication.discardCancelsReview"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.pr.number", { number: 12 }))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.discardDirty", { count: 0 }))).not.toBeInTheDocument();
  });

  it("does not invent a dirty count for another publication", () => {
    renderComponent({
      target: {
        branch: "pub/other",
        title: "API notes",
        kind: PublicationKind.InReview,
        mounted: false,
        dirtyCount: 0,
      },
    });
    expect(screen.getByText(t("home.publication.discardOtherReview"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.discardDirty", { count: 0 }))).not.toBeInTheDocument();
  });

  it("shows discarding state while busy", () => {
    renderComponent({ busy: true });
    expect(screen.getByRole("button", { name: t("home.publication.discarding") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("common.cancel") })).toBeDisabled();
  });
});
