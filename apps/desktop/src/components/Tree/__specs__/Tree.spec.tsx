import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { HomeTreeNode } from "../../../../shared/api";
import { renderWithProviders, screen, userEvent } from "../../../test/render";
import { Tree, type TreeProps } from "../Tree";

describe("Tree", () => {
  const onFile = vi.fn();
  const onFolder = vi.fn();
  const onToggle = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();

  const fileNode: HomeTreeNode = {
    kind: "file",
    path: "docs/a.md",
    title: "Alpha",
  };

  const folderNode: HomeTreeNode = {
    kind: "folder",
    path: "docs",
    title: "Docs",
    children: [fileNode],
  };

  const defaultProps: TreeProps = {
    nodes: [folderNode],
    expanded: new Set<string>(),
    onFile,
    onFolder,
    onToggle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<TreeProps> = {}) =>
    renderWithProviders(<Tree {...defaultProps} {...props} />);

  it("renders folder titles", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: "Docs" })).toBeInTheDocument();
  });

  it("calls onFolder when a collapsed folder is pressed", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: "Docs" }));
    expect(onFolder).toHaveBeenCalledWith(folderNode);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("calls onFolder when an expanded folder is pressed", async () => {
    const user = userEvent.setup();
    renderComponent({ expanded: new Set(["docs"]) });
    await user.click(screen.getByRole("button", { name: "Docs" }));
    expect(onFolder).toHaveBeenCalledWith(folderNode);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("collapses an expanded folder when it is already selected", async () => {
    const user = userEvent.setup();
    renderComponent({ expanded: new Set(["docs"]), selected: "docs" });
    await user.click(screen.getByRole("button", { name: "Docs" }));
    expect(onToggle).toHaveBeenCalledWith("docs");
    expect(onFolder).not.toHaveBeenCalled();
  });

  it("renders nested files when expanded", () => {
    renderComponent({ expanded: new Set(["docs"]) });
    expect(screen.getByRole("button", { name: "Alpha" })).toBeInTheDocument();
  });

  it("does not render expand chevrons", () => {
    renderComponent({ expanded: new Set(["docs"]) });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("opens rename from the overflow menu when writable", async () => {
    const user = userEvent.setup();
    renderComponent({ canWrite: true, onRename, onDelete, expanded: new Set(["docs"]) });
    await user.click(screen.getByRole("button", { name: t("home.tree.menuAria", { title: "Alpha" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.tree.rename") }));
    expect(onRename).toHaveBeenCalledWith(fileNode);
    expect(onFile).not.toHaveBeenCalled();
  });

  it("creates a file in the folder from the overflow menu", async () => {
    const user = userEvent.setup();
    const onNewFileInFolder = vi.fn();
    const onNewFolderInFolder = vi.fn();
    renderComponent({
      canWrite: true,
      onRename,
      onDelete,
      onNewFileInFolder,
      onNewFolderInFolder,
    });
    await user.click(screen.getByRole("button", { name: t("home.tree.menuAria", { title: "Docs" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.tree.newFile") }));
    expect(onNewFileInFolder).toHaveBeenCalledWith(folderNode);
    expect(onFolder).not.toHaveBeenCalled();
  });
});
