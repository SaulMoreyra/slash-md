import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { WorkspaceSwitch } from "../WorkspaceSwitch";

describe("WorkspaceSwitch", () => {
  const onChangeFolder = vi.fn();
  const onCloseWorkspace = vi.fn();
  const onConfig = vi.fn();

  const defaultProps = {
    title: "acme/docs",
    onChangeFolder,
    onCloseWorkspace,
    onConfig,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> & { subtitle?: string } = {}) =>
    renderWithProviders(<WorkspaceSwitch {...defaultProps} {...props} />);

  it("shows the git branch subtitle when provided", () => {
    renderComponent({ subtitle: "pub/onboarding" });
    expect(screen.getByText("acme/docs")).toBeInTheDocument();
    expect(screen.getByText("pub/onboarding")).toBeInTheDocument();
    expect(screen.getByLabelText(t("home.workspaceSwitch.aria"))).toBeInTheDocument();
  });

  it("hides the branch line when subtitle is missing", () => {
    renderComponent();
    expect(screen.getByText("acme/docs")).toBeInTheDocument();
    expect(screen.queryByText("pub/onboarding")).not.toBeInTheDocument();
  });
});
