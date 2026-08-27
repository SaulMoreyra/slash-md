import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { NewPublicationModal } from "../NewPublicationModal";

describe("NewPublicationModal", () => {
  const onClose = vi.fn();
  const onCreate = vi.fn();
  const defaultProps = { onClose, onCreate };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<NewPublicationModal {...defaultProps} {...props} />);

  it("explains what a publication is", () => {
    renderComponent();
    expect(screen.getByText(t("home.publication.modalLede"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.wikiTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.wikiBody"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.draftTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.reviewTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.publishTitle"))).toBeInTheDocument();
  });

  it("creates with trimmed title", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.type(screen.getByLabelText(t("home.publication.modalTitleLabel")), "  Onboarding  ");
    await user.click(screen.getByRole("button", { name: t("common.create") }));
    expect(onCreate).toHaveBeenCalledWith("Onboarding");
  });

  it("keeps create disabled until there is a title", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: t("common.create") })).toBeDisabled();
  });
});
