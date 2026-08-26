import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { shortcutLabel } from "../../../../../components/ShortcutKbd";
import { PaneCloseButton } from "../PaneCloseButton";

describe("PaneCloseButton", () => {
  const onPress = vi.fn();
  const defaultProps = {
    label: t("home.drafts.close"),
    keys: shortcutLabel.togglePane(),
    onPress,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(
      <PaneCloseButton {...defaultProps} {...props}>
        <span>icon</span>
      </PaneCloseButton>,
    );

  it("exposes the shortcut in the accessible name", () => {
    renderComponent();
    expect(
      screen.getByRole("button", { name: `${t("home.drafts.close")} (${shortcutLabel.togglePane()})` }),
    ).toBeInTheDocument();
  });

  it("calls onPress", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalled();
  });
});
