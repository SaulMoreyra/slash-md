import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { PublicationFab } from "../PublicationFab";

describe("PublicationFab", () => {
  const onOpen = vi.fn();

  const defaultProps = {
    visible: true,
    pending: false,
    busy: false,
    onOpen,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<PublicationFab {...defaultProps} {...props} />);

  it("renders nothing when hidden", () => {
    renderComponent({ visible: false });
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
  });

  it("opens the publication hub", async () => {
    const user = userEvent.setup();
    renderComponent({ pending: true });
    await user.click(screen.getByRole("button", { name: t("home.publication.sendReview") }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("disables while an operation is running", () => {
    renderComponent({ busy: true });
    expect(screen.getByRole("button", { name: t("home.publication.sendReview") })).toBeDisabled();
  });
});
