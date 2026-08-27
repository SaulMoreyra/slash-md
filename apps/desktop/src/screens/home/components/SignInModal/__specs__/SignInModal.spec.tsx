import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent, waitFor } from "../../../../../test/render";
import { SignInModal } from "../SignInModal";

describe("SignInModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const probeGhAuth = vi.fn();
  const openUrl = vi.fn(async () => undefined);

  const defaultProps = { onClose, onSave };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    probeGhAuth.mockResolvedValue({ available: true, login: "ada" });
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { probeGhAuth, openUrl },
    });
  });

  const renderComponent = (props: Partial<typeof defaultProps> & { busy?: boolean } = {}) =>
    renderWithProviders(<SignInModal {...defaultProps} {...props} />);

  it("explains that gh auth login is not enough on its own", async () => {
    renderComponent();
    expect(screen.getByText(t("home.modals.signIn.lede"))).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(t("home.modals.signIn.cliReady", { login: "ada" }))).toBeInTheDocument(),
    );
  });

  it("connects the detected GitHub CLI session", async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: t("home.modals.signIn.cliConnectAs", { login: "ada" }) })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: t("home.modals.signIn.cliConnectAs", { login: "ada" }) }));
    expect(onSave).toHaveBeenCalledWith(undefined);
  });

  it("saves a trimmed personal token", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.type(screen.getByLabelText(t("home.modals.signIn.token")), "  abc  ");
    await user.click(screen.getByRole("button", { name: t("home.modals.signIn.connect") }));
    expect(onSave).toHaveBeenCalledWith("abc");
  });
});
