import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { cleanup, fireEvent, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import type { PagePayload } from "../../../../../../shared/api";
import type { TabState } from "../../../../../App/hooks/useTabs";
import { TabBar } from "../TabBar";

function page(path: string, title = ""): PagePayload {
  return {
    path,
    markdown: "# Hello",
    frontmatter: { ...emptyFrontmatter(), title },
    savedAt: null,
    pageKind: "wiki",
    repoMode: "personal",
    publishEnabled: true,
    reviewable: true,
    prUrl: null,
  };
}

function tab(path: string, title: string, dirty = false): TabState {
  return { key: path, page: page(path, title), focusThreadId: null, dirty };
}

describe("TabBar", () => {
  const onActivateTab = vi.fn();
  const onCloseTab = vi.fn();

  const defaultProps = {
    tabs: [tab("docs/a.md", "Alpha"), tab("docs/b.md", "Beta")],
    activeKey: "docs/a.md",
    onActivateTab,
    onCloseTab,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<TabBar {...defaultProps} {...props} />);

  it("renders nothing when there are no tabs", () => {
    renderComponent({ tabs: [] });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("lists open pages and marks the active tab", () => {
    renderComponent();
    expect(screen.getByRole("tablist", { name: t("home.tabs.aria") })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "false");
  });

  it("falls back to the file name or untitled when the title is empty", () => {
    renderComponent({
      tabs: [tab("docs/notes.md", ""), tab("docs/.md", "")],
      activeKey: "docs/notes.md",
    });
    expect(screen.getByRole("tab", { name: "notes" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: t("common.untitled") })).toBeInTheDocument();
  });

  it("activates a tab on click", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("tab", { name: "Beta" }));
    expect(onActivateTab).toHaveBeenCalledWith("docs/b.md");
  });

  it("closes a tab from the close button without activating it", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.tabs.close", { title: "Beta" }) }));
    expect(onCloseTab).toHaveBeenCalledWith("docs/b.md");
    expect(onActivateTab).not.toHaveBeenCalled();
  });

  it("activates and focuses the next tab with ArrowRight", () => {
    renderComponent();
    screen.getByRole("tablist").focus();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(onActivateTab).toHaveBeenCalledWith("docs/b.md");
  });

  it("wraps to the last tab with ArrowLeft from the first", () => {
    renderComponent();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowLeft" });
    expect(onActivateTab).toHaveBeenCalledWith("docs/b.md");
  });

  it("activates the first tab with Home", () => {
    renderComponent({ activeKey: "docs/b.md" });
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "Home" });
    expect(onActivateTab).toHaveBeenCalledWith("docs/a.md");
  });

  it("activates a tab with Enter when focused", () => {
    renderComponent();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Beta" }), { key: "Enter" });
    expect(onActivateTab).toHaveBeenCalledWith("docs/b.md");
  });

  it("closes a tab on middle click without activating it", () => {
    renderComponent();
    screen.getByRole("tab", { name: "Beta" }).dispatchEvent(
      new MouseEvent("auxclick", { button: 1, bubbles: true }),
    );
    expect(onCloseTab).toHaveBeenCalledWith("docs/b.md");
    expect(onActivateTab).not.toHaveBeenCalled();
  });

  it("exposes unsaved state in the tab name", () => {
    renderComponent({
      tabs: [tab("docs/a.md", "Alpha", true)],
      activeKey: "docs/a.md",
    });
    expect(
      screen.getByRole("tab", { name: `Alpha (${t("home.tabs.dirty")})` }),
    ).toBeInTheDocument();
  });

  it("clamps a long tab name with an ellipsis but keeps the full title", () => {
    const longTitle = "This is an extremely long document title that should be trimmed";
    renderComponent({
      tabs: [tab("docs/long.md", longTitle)],
      activeKey: "docs/long.md",
    });
    const element = screen.getByRole("tab", { name: longTitle });
    expect(element).toHaveAttribute("title", longTitle);
    expect(screen.getByText("This is an extremely lo…")).toBeInTheDocument();
  });
});
