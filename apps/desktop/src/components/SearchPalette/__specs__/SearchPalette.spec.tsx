import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../test/render";
import { SearchPalette, type SearchPaletteProps } from "../SearchPalette";

const hits: LibraryHit[] = [
  { kind: "file", path: "docs/a.md", title: "Alpha", trail: "docs" },
  { kind: "folder", path: "docs", title: "Docs", trail: "" },
];

describe("SearchPalette", () => {
  const onQuery = vi.fn();
  const onClose = vi.fn();
  const onOpenFile = vi.fn();
  const onOpenFolder = vi.fn();

  const defaultProps: SearchPaletteProps = {
    query: "a",
    hits,
    onQuery,
    onClose,
    onOpenFile,
    onOpenFolder,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<SearchPaletteProps> = {}) =>
    renderWithProviders(<SearchPalette {...defaultProps} {...props} />);

  it("anchors at the top so results grow downward", () => {
    renderComponent();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-placement", "top");
  });

  it("renders result hits", () => {
    renderComponent();
    expect(screen.getByRole("option", { name: /^Alpha/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^Docs$/i })).toBeInTheDocument();
    expect(screen.getByText(t("search.hint"))).toBeInTheDocument();
    expect(screen.getByText(t("search.footOpen"))).toBeInTheDocument();
  });

  it("opens a file when a hit is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("option", { name: /^Alpha/i }));
    expect(onOpenFile).toHaveBeenCalledWith("docs/a.md");
  });

  it("shows empty state when query has no hits", () => {
    renderComponent({ query: "zzz", hits: [] });
    expect(screen.getByRole("status")).toHaveTextContent(t("search.empty", { query: "zzz" }));
    expect(screen.queryByText(t("search.footOpen"))).not.toBeInTheDocument();
  });

  it("hides the results panel while idle", () => {
    renderComponent({ query: "", hits: [] });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
