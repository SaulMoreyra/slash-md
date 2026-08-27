import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../test/render";
import { mockPayload } from "../../../../__fixtures__/home";
import { NavKind, TreeExpandMode } from "../../../../enums";
import { RailNav } from "../RailNav";

describe("RailNav", () => {
  const onNav = vi.fn();
  const onToggleAllFolders = vi.fn();

  const defaultProps = {
    nav: { kind: NavKind.Drafts } as const,
    payload: mockPayload(),
    isWorkspace: true,
    canToggleAllFolders: true,
    treeExpandMode: TreeExpandMode.Expand,
    onNav,
    onToggleAllFolders,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<RailNav {...defaultProps} {...props} />);

  it("shows inbox and publications in workspace mode", () => {
    renderComponent({ isWorkspace: true });
    expect(screen.getByText(t("home.nav.inbox"))).toBeInTheDocument();
    expect(screen.getByText(t("home.nav.drafts"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.nav.inReview"))).not.toBeInTheDocument();
    expect(screen.getByText(t("home.publication.listTitle"))).toBeInTheDocument();
  });

  it("hides inbox and publications outside workspace mode", () => {
    renderComponent({ isWorkspace: false });
    expect(screen.queryByText(t("home.nav.inbox"))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.nav.inReview"))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.listTitle"))).not.toBeInTheDocument();
    expect(screen.getByText(t("home.nav.drafts"))).toBeInTheDocument();
  });

  it("keeps drafts selected and still navigates on a second click", async () => {
    const user = userEvent.setup();
    renderComponent();
    const drafts = screen.getByRole("option", { name: new RegExp(t("home.nav.drafts")) });
    expect(drafts).toHaveAttribute("aria-selected", "true");
    await user.click(drafts);
    expect(onNav).toHaveBeenCalledWith({ kind: NavKind.Drafts });
    expect(drafts).toHaveAttribute("aria-selected", "true");
  });

  it("expands every folder from the workspace header", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.tree.expandAll") }));
    expect(onToggleAllFolders).toHaveBeenCalled();
    expect(onNav).not.toHaveBeenCalled();
  });

  it("collapses every folder when the tree is fully open", async () => {
    const user = userEvent.setup();
    renderComponent({ treeExpandMode: TreeExpandMode.Collapse });
    await user.click(screen.getByRole("button", { name: t("home.tree.collapseAll") }));
    expect(onToggleAllFolders).toHaveBeenCalled();
  });

  it("hides the tree toggle when there are no expandable folders", () => {
    renderComponent({ canToggleAllFolders: false });
    expect(screen.queryByRole("button", { name: t("home.tree.expandAll") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.tree.collapseAll") })).not.toBeInTheDocument();
  });
});
