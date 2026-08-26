import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../test/render";
import { WelcomeScreen } from "../WelcomeScreen";

describe("WelcomeScreen", () => {
  const onOpen = vi.fn();
  const onOpenPath = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof WelcomeScreen>> = {}) =>
    renderWithProviders(
      <WelcomeScreen busy={false} error={null} onOpen={onOpen} onOpenPath={onOpenPath} {...props} />,
    );

  it("renders brand and open folder action", () => {
    renderComponent();
    expect(screen.getByText("Slash MD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("welcome.openFolder") })).toBeInTheDocument();
  });

  it("calls onOpen when open folder is pressed", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("welcome.openFolder") }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("shows error message", () => {
    renderComponent({ error: "boom" });
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
