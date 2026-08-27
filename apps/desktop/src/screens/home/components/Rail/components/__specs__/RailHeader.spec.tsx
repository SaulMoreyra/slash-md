import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../test/render";
import { shortcutLabel } from "../../../../../../components/ShortcutKbd";
import { RailHeader } from "../RailHeader";

describe("RailHeader", () => {
  const onChangeFolder = vi.fn();
  const onCloseWorkspace = vi.fn();
  const onConfig = vi.fn();
  const onCloseRail = vi.fn();

  const defaultProps = {
    title: "acme/docs",
    subtitle: "main",
    onChangeFolder,
    onCloseWorkspace,
    onConfig,
    onCloseRail,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<RailHeader {...defaultProps} {...props} />);

  it("renders the brand above the workspace switch", () => {
    renderComponent();
    expect(screen.getByRole("img", { name: t("app.brand") })).toBeInTheDocument();
    expect(screen.getByText("acme/docs")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("closes the rail from the header action", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole("button", { name: `${t("home.rail.close")} (${shortcutLabel.toggleRail()})` }),
    );
    expect(onCloseRail).toHaveBeenCalled();
  });
});
