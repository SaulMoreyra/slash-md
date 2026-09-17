import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "../../../../test/render";
import type { PagePayload } from "../../../../../shared/api";
import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import type { AppControllerApi } from "../../../hooks/useAppController";
import { buildMockAppController } from "../../../__specs__/mocks";
import { EditorSlot } from "../EditorSlot";

const mockUseApp = vi.fn();

vi.mock("../../../context", () => ({
  useApp: () => mockUseApp(),
}));

vi.mock("../../../../screens/editor", () => ({
  EditorScreen: ({
    page,
    active,
    trail,
  }: {
    page: PagePayload;
    active?: boolean;
    trail?: string;
  }) => (
    <div
      data-testid={`editor-${page.path}`}
      data-active={String(Boolean(active))}
      data-trail={trail ?? ""}
    />
  ),
}));

function page(path: string): PagePayload {
  return {
    path,
    markdown: "# Hello",
    frontmatter: emptyFrontmatter(),
    savedAt: null,
    pageKind: "wiki",
    repoMode: "personal",
    publishEnabled: true,
    reviewable: true,
    prUrl: null,
  };
}

function withTabs(
  tabs: { path: string; focusThreadId?: string | null }[],
  activeKey: string | null,
  trail = "",
): AppControllerApi {
  return buildMockAppController({
    session: {
      workspace: {
        root: "/docs",
        config: null,
        slashmd: {},
        needsInit: false,
        auth: { login: "tester" },
        theme: "dark",
      },
      tabs: tabs.map((tab) => ({
        key: tab.path,
        page: page(tab.path),
        focusThreadId: tab.focusThreadId ?? null,
        dirty: false,
      })),
      activeKey,
      page: activeKey ? page(activeKey) : null,
      trail,
    },
  });
}

describe("EditorSlot", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseApp.mockReturnValue(withTabs([], null));
  });

  it("renders nothing when no tab is open", () => {
    const { container } = render(<EditorSlot />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mounts one editor per tab and keeps inactive ones hidden", () => {
    mockUseApp.mockReturnValue(
      withTabs(
        [{ path: "docs/a.md" }, { path: "docs/b.md" }],
        "docs/b.md",
      ),
    );
    render(<EditorSlot />);

    expect(screen.getByTestId("editor-docs/a.md")).toBeInTheDocument();
    expect(screen.getByTestId("editor-docs/b.md")).toBeInTheDocument();
    expect(screen.getByTestId("editor-docs/a.md").dataset.active).toBe("false");
    expect(screen.getByTestId("editor-docs/b.md").dataset.active).toBe("true");

    const hidden = screen.getByTestId("editor-docs/a.md").parentElement;
    expect(hidden).toHaveClass("hidden");
    expect(hidden).toHaveAttribute("inert");

    const visible = screen.getByTestId("editor-docs/b.md").parentElement;
    expect(visible).not.toHaveClass("hidden");
    expect(visible).not.toHaveAttribute("inert");
  });

  it("passes the active trail only to the active panel", () => {
    mockUseApp.mockReturnValue(
      withTabs([{ path: "docs/a.md" }, { path: "docs/b.md" }], "docs/a.md", "Lib / A"),
    );
    render(<EditorSlot />);
    expect(screen.getByTestId("editor-docs/a.md").dataset.active).toBe("true");
    expect(screen.getByTestId("editor-docs/a.md").dataset.trail).toBe("Lib / A");
    expect(screen.getByTestId("editor-docs/b.md").dataset.active).toBe("false");
    expect(screen.getByTestId("editor-docs/b.md").dataset.trail).toBe("");
  });
});