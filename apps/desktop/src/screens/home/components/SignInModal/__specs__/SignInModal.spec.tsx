import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { SignInModal } from "../SignInModal";

describe("SignInModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("saves trimmed token", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInModal onClose={onClose} onSave={onSave} />);
    await user.type(screen.getByLabelText(t("home.modals.signIn.token")), "  abc  ");
    await user.click(screen.getByRole("button", { name: t("home.modals.signIn.connect") }));
    expect(onSave).toHaveBeenCalledWith("abc");
  });
});
