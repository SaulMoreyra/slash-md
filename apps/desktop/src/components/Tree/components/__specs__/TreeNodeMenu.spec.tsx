import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { HomeTreeNode } from "../../../../../shared/api";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../test/render";
import { TreeNodeMenu } from "../TreeNodeMenu";

describe("TreeNodeMenu", () => {
  const onRename = vi.fn();
  const onDelete = vi.fn();
  const onNewFile = vi.fn();
  const onNewFolder = vi.fn();
  const folder: HomeTreeNode = { kind: "folder", path: "docs/guides", title: "guides", children: [] };
  const file: HomeTreeNode = { kind: "file", path: "docs/a.md", title: "Alpha" };

  const defaultProps = { node: folder, onRename, onDelete, onNewFile, onNewFolder };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<TreeNodeMenu {...defaultProps} {...props} />);

  it("creates a file from a folder overflow menu", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.tree.menuAria", { title: "guides" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.tree.newFile") }));
    expect(onNewFile).toHaveBeenCalledWith(folder);
    expect(onNewFolder).not.toHaveBeenCalled();
  });

  it("creates a folder from a folder overflow menu", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.tree.menuAria", { title: "guides" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.tree.newFolder") }));
    expect(onNewFolder).toHaveBeenCalledWith(folder);
    expect(onNewFile).not.toHaveBeenCalled();
  });

  it("omits create actions on file rows", async () => {
    const user = userEvent.setup();
    renderComponent({ node: file });
    await user.click(screen.getByRole("button", { name: t("home.tree.menuAria", { title: "Alpha" }) }));
    expect(screen.queryByRole("menuitem", { name: t("home.tree.newFile") })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: t("home.tree.newFolder") })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("home.tree.rename") })).toBeInTheDocument();
  });
});
