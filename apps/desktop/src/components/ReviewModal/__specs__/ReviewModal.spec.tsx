import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, waitFor, userEvent } from "../../../test/render";
import { ReviewModal, type ReviewModalProps } from "../ReviewModal";

describe("ReviewModal", () => {
  const onClose = vi.fn();
  const onSend = vi.fn();
  const previewReview = vi.fn();

  const defaultProps: ReviewModalProps = {
    onClose,
    onSend,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    previewReview.mockResolvedValue([
      { title: "Page A", path: "a.md" },
      { title: "Page B", path: "b.md" },
    ]);
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { previewReview },
    });
  });

  const renderComponent = (props: Partial<ReviewModalProps> = {}) =>
    renderWithProviders(<ReviewModal {...defaultProps} {...props} />);

  it("renders preview items after load", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Page A/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Page B/)).toBeInTheDocument();
  });

  it("sends reviewers when Send is pressed", async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("modal.review.send") })).not.toBeDisabled();
    });
    const input = screen.getAllByPlaceholderText(t("modal.review.reviewersPlaceholder"))[0]!;
    await user.clear(input);
    await user.type(input, "@alice");
    await user.click(screen.getByRole("button", { name: t("modal.review.send") }));
    expect(onSend).toHaveBeenCalledWith("@alice", undefined);
  });

  it("shows empty state when preview has no items", async () => {
    previewReview.mockResolvedValue([]);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(t("modal.review.empty"))).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: t("modal.review.send") })).not.toBeInTheDocument();
  });

  it("keeps cancel only when the preview is empty", async () => {
    previewReview.mockResolvedValue([]);
    renderComponent({ hub: { busy: false } });
    await waitFor(() => {
      expect(screen.getByText(t("modal.review.empty"))).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: t("modal.review.send") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.leave") })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("common.cancel") })).toBeInTheDocument();
  });

  it("disables send while the hub is busy", async () => {
    renderComponent({ hub: { busy: true } });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("modal.review.send") })).toBeDisabled();
    });
    expect(screen.queryByRole("button", { name: t("home.publication.leave") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
  });
});
