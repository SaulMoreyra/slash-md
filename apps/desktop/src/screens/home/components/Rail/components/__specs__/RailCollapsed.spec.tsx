import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { WorkspaceInfo } from "../../../../../../../shared/api";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../test/render";
import { shortcutLabel } from "../../../../../../components/ShortcutKbd";
import { mockPayload } from "../../../../__fixtures__/home";
import { CreateIntent, NavKind } from "../../../../enums";
import { RailCollapsed } from "../RailCollapsed";

function mockWorkspace(): WorkspaceInfo {
  return {
    root: "/tmp/wiki",
    config: null,
    slashmd: {},
    needsInit: false,
    auth: null,
    theme: "dark",
  };
}

describe("RailCollapsed", () => {
  const onToggle = vi.fn();
  const onChangeFolder = vi.fn();
  const onCloseWorkspace = vi.fn();
  const onConfig = vi.fn();
  const onOpenSearch = vi.fn();
  const onNav = vi.fn();
  const onInit = vi.fn();
  const onNewPage = vi.fn();
  const onSignIn = vi.fn();
  const onSignOut = vi.fn();
  const onFolderModal = vi.fn();
  const onRefresh = vi.fn();

  const defaultProps = {
    title: "acme/docs",
    nav: { kind: NavKind.Drafts } as const,
    payload: mockPayload(),
    isWorkspace: true,
    busy: false,
    workspace: mockWorkspace(),
    personal: false,
    createIntent: CreateIntent.Page,
    railOpen: false,
    onToggle,
    onChangeFolder,
    onCloseWorkspace,
    onConfig,
    onOpenSearch,
    onNav,
    onInit,
    onNewPage,
    onSignIn,
    onSignOut,
    onFolderModal,
    onRefresh,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<RailCollapsed {...defaultProps} {...props} />);

  it("renders a full-height collapsed library chrome", () => {
    renderComponent();
    expect(screen.getByRole("complementary", { name: t("home.rail.aria") })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `${t("home.rail.open")} (${shortcutLabel.toggleRail()})` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `${t("home.nav.search")} (${shortcutLabel.search()})` }),
    ).toBeInTheDocument();
  });

  it("labels the toggle as close when the overlay is open", () => {
    renderComponent({ railOpen: true });
    expect(
      screen.getByRole("button", { name: `${t("home.rail.close")} (${shortcutLabel.toggleRail()})` }),
    ).toBeInTheDocument();
  });

  it("expands the library from the collapsed toggle", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: `${t("home.rail.open")} (${shortcutLabel.toggleRail()})` }));
    expect(onToggle).toHaveBeenCalled();
  });
});
