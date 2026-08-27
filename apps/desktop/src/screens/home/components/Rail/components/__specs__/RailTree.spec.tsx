import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../../test/render";
import { mockPayload } from "../../../../__fixtures__/home";
import { RailTree } from "../RailTree";

describe("RailTree", () => {
  const onFile = vi.fn();
  const onFolder = vi.fn();
  const onToggle = vi.fn();

  const defaultProps = {
    expanded: new Set<string>(),
    onFile,
    onFolder,
    onToggle,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading skeleton while the payload is missing", () => {
    renderWithProviders(<RailTree payload={null} roots={[]} {...defaultProps} />);
    expect(screen.getByRole("status", { name: t("home.tree.loading") })).toBeInTheDocument();
  });

  it("shows empty copy when there are no pages", () => {
    renderWithProviders(<RailTree payload={mockPayload()} roots={[]} {...defaultProps} />);
    expect(screen.getByText(t("home.tree.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.tree.emptyBody"))).toBeInTheDocument();
  });

  it("renders the tree when there are roots", () => {
    renderWithProviders(
      <RailTree
        payload={mockPayload()}
        roots={[{ kind: "folder", path: "docs", title: "Docs", children: [] }]}
        {...defaultProps}
      />,
    );
    expect(screen.getByRole("button", { name: "Docs" })).toBeInTheDocument();
    expect(screen.queryByText(t("home.tree.emptyTitle"))).not.toBeInTheDocument();
  });

  it("hides the tree while the workspace needs init", () => {
    renderWithProviders(
      <RailTree payload={mockPayload({ needsInit: true })} roots={[]} {...defaultProps} />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.tree.emptyTitle"))).not.toBeInTheDocument();
  });
});
