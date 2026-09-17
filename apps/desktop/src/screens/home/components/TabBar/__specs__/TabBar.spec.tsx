import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
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

  it("exposes unsaved state in the tab name", () => {
    renderComponent({
      tabs: [tab("docs/a.md", "Alpha", true)],
      activeKey: "docs/a.md",
    });
    expect(
      screen.getByRole("tab", { name: `Alpha (${t("home.tabs.dirty")})` }),
    ).toBeInTheDocument();
  });
});
